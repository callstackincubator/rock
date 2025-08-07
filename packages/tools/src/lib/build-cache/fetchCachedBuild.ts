import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import * as tar from 'tar';
import { color, colorLink } from '../color.js';
import { RnefError } from '../error.js';
import logger from '../logger.js';
import { relativeToCwd } from '../path.js';
import { spinner } from '../prompts.js';
import {
  getLocalArtifactPath,
  getLocalBinaryPath,
  type RemoteBuildCache,
} from './common.js';
import type { LocalBuild } from './localBuildCache.js';

type FetchCachedBuildOptions = {
  artifactName: string;
  remoteCacheProvider: undefined | null | { (): RemoteBuildCache };
};

export async function fetchCachedBuild({
  artifactName,
  remoteCacheProvider,
}: FetchCachedBuildOptions): Promise<LocalBuild | undefined> {
  if (remoteCacheProvider === null) {
    return undefined;
  }
  if (remoteCacheProvider === undefined) {
    logger.warn(`No remote cache provider set. You won't be able to access reusable builds from e.g. GitHub Actions. 
To configure it, set the "remoteCacheProvider" key in ${colorLink(
      'rnef.config.mjs'
    )} file. For example:

import { providerGitHub } from '@rnef/provider-github';
export default {
  // ...
  remoteCacheProvider: providerGitHub()
}

To disable this warning, set the provider to null:
{
  remoteCacheProvider: null
}`);
    return undefined;
  }
  const loader = spinner();
  const localArtifactPath = getLocalArtifactPath(artifactName);
  const remoteBuildCache = remoteCacheProvider();
  const response = await remoteBuildCache.download({ artifactName });
  loader.start(
    `Downloading cached build from ${color.bold(remoteBuildCache.name)}`
  );
  await handleDownloadResponse(
    response,
    localArtifactPath,
    (progress, totalMB) => {
      loader.message(
        `Downloading cached build from ${color.bold(remoteBuildCache.name)} (${progress}% of ${totalMB} MB)`
      );
    }
  );
  await extractArtifactTarballIfNeeded(localArtifactPath);
  const binaryPath = getLocalBinaryPath(localArtifactPath);
  if (!binaryPath) {
    loader.stop(`No binary found for ${color.bold(artifactName)}.`);
    return undefined;
  }
  loader.stop(
    `Downloaded cached build to: ${colorLink(relativeToCwd(localArtifactPath))}`
  );

  return {
    name: artifactName,
    artifactPath: localArtifactPath,
    binaryPath,
  };
}

async function trackProgressFromStream(
  response: Response,
  onProgress: (progress: string, totalMB: string) => void
): Promise<Response> {
  const contentLength = response.headers.get('content-length');

  if (!contentLength || !response.body) {
    return response;
  }

  const totalBytes = parseInt(contentLength, 10);
  const totalMB = (totalBytes / 1024 / 1024).toFixed(2);
  let processedBytes = 0;

  const reader = response.body.getReader();
  const stream = new ReadableStream({
    async start(controller) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        processedBytes += value.length;
        const progress = ((processedBytes / totalBytes) * 100).toFixed(0);

        onProgress(progress, totalMB);

        controller.enqueue(value);
      }
      controller.close();
    },
  });

  return new Response(stream);
}

export async function handleDownloadResponse(
  response: Response,
  localArtifactPath: string,
  onProgress: (progress: string, totalMB: string) => void
) {
  try {
    fs.mkdirSync(localArtifactPath, { recursive: true });
    if (!response.ok || !response.body) {
      throw new Error(`Failed to download artifact: ${response.statusText}`);
    }

    const responseWithProgress = await trackProgressFromStream(
      response,
      onProgress
    );

    const zipPath = localArtifactPath + '.zip';
    const buffer = await responseWithProgress.arrayBuffer();
    fs.writeFileSync(zipPath, new Uint8Array(buffer));
    unzipFile(zipPath, localArtifactPath);
    fs.unlinkSync(zipPath);
  } catch (error) {
    throw new RnefError(`Unexpected error`, { cause: error });
  }
}

export async function handleUploadResponse(
  getResponse: (buffer: Buffer) => Response,
  buffer: Buffer,
  onProgress: (progress: string, totalMB: string) => void
) {
  try {
    const response = getResponse(buffer);
    if (!response.body) {
      throw new Error('Response body is empty');
    }
    const responseWithProgress = await trackProgressFromStream(
      response,
      onProgress
    );
    await responseWithProgress.arrayBuffer();
  } catch (error) {
    throw new RnefError(`Unexpected error during upload`, { cause: error });
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
