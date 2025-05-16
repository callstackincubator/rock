import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import * as tar from 'tar';
import { color } from '../color.js';
import { RnefError } from '../error.js';
import logger from '../logger.js';
import { getProjectRoot } from '../project.js';
import { spinner } from '../prompts.js';
import {
  getLocalArtifactPath,
  getLocalBinaryPath,
  type RemoteBuildCache,
  type SupportedRemoteCacheProviders,
} from './common.js';
import type { LocalBuild } from './localBuildCache.js';
import { queryLocalBuildCache } from './localBuildCache.js';
import { createRemoteBuildCache } from './remoteBuildCache.js';

export type Distribution = 'simulator' | 'device';

type FetchCachedBuildOptions = {
  artifactName: string;
  remoteCacheProvider:
    | SupportedRemoteCacheProviders
    | undefined
    | null
    | { new (): RemoteBuildCache };
};

export async function fetchCachedBuild({
  artifactName,
  remoteCacheProvider,
}: FetchCachedBuildOptions): Promise<LocalBuild | null> {
  if (remoteCacheProvider === null) {
    return null;
  }
  if (remoteCacheProvider === undefined) {
    logger.warn(`No remote cache provider set. You won't be able to access reusable builds from e.g. GitHub Actions. 
To configure it, set the "remoteCacheProvider" key in ${color.cyan(
      'rnef.config.mjs'
    )} file:
{
  remoteCacheProvider: 'github-actions'
}
To disable this warning, set "remoteCacheProvider" to null.
Proceeding with local build.`);
    return null;
  }
  const loader = spinner();
  loader.start('Looking for a local cached build');

  const root = getProjectRoot();

  const localBuild = queryLocalBuildCache(artifactName);
  if (localBuild != null) {
    loader.stop(`Found local cached build: ${color.cyan(localBuild.name)}`);
    return localBuild;
  }

  const remoteBuildCache = await createRemoteBuildCache(remoteCacheProvider);
  if (!remoteBuildCache) {
    loader.stop(`No remote cache provider found, skipping.`);
    return null;
  }

  loader.stop(`No local build cached. Checking ${remoteBuildCache.name}.`);

  loader.start(`Downloading cached build from ${remoteBuildCache.name}`);
  const localArtifactPath = getLocalArtifactPath(artifactName);
  const response = await remoteBuildCache.download({ artifactName });
  await handleDownloadResponse(
    response,
    localArtifactPath,
    remoteBuildCache.name,
    loader
  );
  await extractArtifactTarballIfNeeded(localArtifactPath);
  const binaryPath = getLocalBinaryPath(localArtifactPath);
  if (!binaryPath) {
    loader.stop(`No binary found for "${artifactName}".`);
    return null;
  }

  loader.stop(
    `Downloaded cached build: ${color.cyan(path.relative(root, binaryPath))}.`
  );

  return {
    name: artifactName,
    artifactPath: localArtifactPath,
    binaryPath,
  };
}

async function handleDownloadResponse(
  response: Response,
  localArtifactPath: string,
  name: string,
  loader: ReturnType<typeof spinner>
) {
  try {
    fs.mkdirSync(localArtifactPath, { recursive: true });
    if (!response.ok || !response.body) {
      throw new Error(`Failed to download artifact: ${response.statusText}`);
    }
    let responseData = response;
    const contentLength = response.headers.get('content-length');

    if (contentLength) {
      const totalBytes = parseInt(contentLength, 10);
      const totalMB = (totalBytes / 1024 / 1024).toFixed(2);
      let downloadedBytes = 0;

      const reader = response.body.getReader();
      const stream = new ReadableStream({
        async start(controller) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }
            downloadedBytes += value.length;
            const progress = ((downloadedBytes / totalBytes) * 100).toFixed(0);
            loader?.message(
              `Downloading cached build from ${name} (${progress}% of ${totalMB} MB)`
            );
            controller.enqueue(value);
          }
          controller.close();
        },
      });
      responseData = new Response(stream);
    }

    const zipPath = localArtifactPath + '.zip';
    const buffer = await responseData.arrayBuffer();
    fs.writeFileSync(zipPath, new Uint8Array(buffer));
    unzipFile(zipPath, localArtifactPath);
    fs.unlinkSync(zipPath);
  } catch (error) {
    loader?.stop(`Failed: Downloading cached build from ${name}`);
    throw new RnefError(`Unexpected error`, { cause: error });
  }
}

function unzipFile(zipPath: string, targetPath: string): void {
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(targetPath, true);
}

async function extractArtifactTarballIfNeeded(artifactPath: string) {
  const tarPath = path.join(artifactPath, 'app.tar.gz');

  // If the tarball is not found, it means the artifact is already unpacked.
  if (!fs.existsSync(tarPath)) {
    return;
  }

  // iOS simulator build artifact (*.app directory) is packed in .tar.gz file to
  // preserve execute file permission.
  // See: https://github.com/actions/upload-artifact?tab=readme-ov-file#permission-loss
  await tar.extract({
    file: tarPath,
    cwd: artifactPath,
    gzip: true,
  });
  fs.unlinkSync(tarPath);
}
