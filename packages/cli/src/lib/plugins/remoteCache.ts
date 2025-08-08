import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { PluginApi, PluginOutput } from '@rnef/config';
import type { FingerprintSources, RemoteBuildCache } from '@rnef/tools';
import {
  color,
  colorLink,
  formatArtifactName,
  getLocalArtifactPath,
  getLocalBinaryPath,
  handleDownloadResponse,
  handleUploadResponse,
  logger,
  relativeToCwd,
  RnefError,
  spawn,
  spinner,
} from '@rnef/tools';
import AdmZip from 'adm-zip';
import * as tar from 'tar';
import { templateIndexHtml, templateManifestPlist } from '../adHocTemplates.js';

type Flags = {
  platform?: 'ios' | 'android';
  traits?: string[];
  name?: string;
  json?: boolean;
  all?: boolean;
  allButLatest?: boolean;
  binaryPath?: string;
  adHoc?: boolean;
};

async function remoteCache({
  action,
  args,
  remoteCacheProvider,
  projectRoot,
  fingerprintOptions,
}: {
  action: string;
  args: Flags;
  remoteCacheProvider: null | (() => RemoteBuildCache);
  projectRoot: string;
  fingerprintOptions: FingerprintSources;
}) {
  const isJsonOutput = args.json;
  if (!remoteCacheProvider) {
    return null;
  }
  const remoteBuildCache = remoteCacheProvider();

  validateArgs(args, action);

  const artifactName =
    args.name ??
    (await formatArtifactName({
      platform: args.platform,
      traits: args.traits,
      root: projectRoot,
      fingerprintOptions,
      raw: isJsonOutput,
    }));

  switch (action) {
    case 'list': {
      const artifacts = await remoteBuildCache.list({
        artifactName,
        limit: args.all ? undefined : 1,
      });
      if (artifacts.length > 0 && !args.all) {
        const artifact = artifacts[0];
        if (isJsonOutput) {
          console.log(JSON.stringify(artifact, null, 2));
        } else {
          logger.log(`Artifact information:
- name: ${color.bold(color.blue(artifact.name))}
- url: ${colorLink(artifact.url)}`);
        }
      } else if (artifacts.length > 0 && args.all) {
        if (isJsonOutput) {
          console.log(JSON.stringify(artifacts, null, 2));
        } else {
          artifacts.forEach((artifact) => {
            logger.log(`Artifact information:
- name: ${color.bold(color.blue(artifact.name))}
- url: ${colorLink(artifact.url)}`);
          });
        }
      }
      break;
    }
    case 'list-all': {
      const artifactName = undefined;
      const artifacts = await remoteBuildCache.list({ artifactName });
      const platform = args.platform;
      const traits = args.traits;
      const output =
        platform && traits
          ? artifacts.filter((artifact) =>
              artifact.name.startsWith(`rnef-${platform}-${traits.join('-')}`)
            )
          : artifacts;
      if (isJsonOutput) {
        console.log(JSON.stringify(output, null, 2));
      } else {
        logger.log(`Artifacts:
${output
  .map(
    (artifact) =>
      `- name: ${color.bold(color.blue(artifact.name))}\n- url: ${colorLink(
        artifact.url
      )}`
  )
  .join('\n')}
        `);
      }
      break;
    }
    case 'download': {
      const localArtifactPath = getLocalArtifactPath(artifactName);
      const response = await remoteBuildCache.download({ artifactName });
      const loader = spinner({ silent: isJsonOutput });
      loader.start(
        `Downloading cached build from ${color.bold(remoteBuildCache.name)}`
      );
      await handleDownloadResponse(
        response,
        localArtifactPath,
        (progress, totalMB) => {
          loader.message(
            `Downloading cached build from ${color.bold(
              remoteBuildCache.name
            )} (${progress}% of ${totalMB} MB)`
          );
        }
      );
      const binaryPath = getLocalBinaryPath(localArtifactPath);
      loader.stop(
        `Downloaded cached build from ${color.bold(remoteBuildCache.name)}`
      );
      if (!binaryPath) {
        throw new RnefError(`Failed to save binary for "${artifactName}".`);
      }
      if (isJsonOutput) {
        console.log(
          JSON.stringify({ name: artifactName, path: binaryPath }, null, 2)
        );
      } else {
        logger.log(
          `Artifact information:
- name: ${color.bold(color.blue(artifactName))}
- path: ${colorLink(relativeToCwd(binaryPath))}`
        );
      }
      break;
    }
    case 'upload': {
      const localArtifactPath = getLocalArtifactPath(artifactName);
      const binaryPath =
        args.binaryPath ?? getLocalBinaryPath(localArtifactPath);
      if (!binaryPath) {
        throw new RnefError(`No binary found for "${artifactName}".`);
      }
      const {
        buffer,
        isBinaryPathDirectory,
        isAppDirectory,
        absoluteTarballPath,
      } = await getBinaryBuffer(
        binaryPath,
        artifactName,
        localArtifactPath,
        args
      );

      try {
        let uploadedArtifact;

        const { version, bundleIdentifier, appName, ipaFileName } =
          await getInfoPlist(binaryPath);

        const { name, url, getResponse } = await remoteBuildCache.upload({
          artifactName,
          uploadArtifactName: args.adHoc
            ? `ad-hoc/${artifactName}/${appName}.ipa`
            : undefined,
        });
        const loader = spinner({ silent: isJsonOutput });
        const uploadMessage = `${
          args.adHoc ? 'IPA, index.html and manifest.plist' : 'build'
        } to ${color.bold(remoteBuildCache.name)}`;
        loader.start(`Uploading ${uploadMessage}`);
        await handleUploadResponse(getResponse, buffer, (progress, totalMB) => {
          loader.message(
            `Uploading ${uploadMessage} (${progress}% of ${totalMB} MB)`
          );
        });

        uploadedArtifact = { name, url };

        // Upload index.html and manifest.plist for ad-hoc distribution
        if (args.adHoc) {
          const { url: urlIndexHtml, getResponse: getResponseIndexHtml } =
            await remoteBuildCache.upload({
              artifactName,
              uploadArtifactName: `ad-hoc/${artifactName}/index.html`,
            });
          getResponseIndexHtml(
            Buffer.from(
              templateIndexHtml({ appName, bundleIdentifier, version })
            ),
            'text/html'
          );

          const { getResponse: getResponseManifestPlist } =
            await remoteBuildCache.upload({
              artifactName,
              uploadArtifactName: `ad-hoc/${artifactName}/manifest.plist`,
            });
          getResponseManifestPlist((baseUrl) =>
            Buffer.from(
              templateManifestPlist({
                appName,
                version,
                baseUrl: baseUrl.replace('/manifest.plist', ''),
                ipaName: ipaFileName,
                bundleIdentifier,
                platformIdentifier: 'com.apple.platform.iphoneos',
              })
            )
          );

          // For ad-hoc distribution, we want the url to point to the index.html for easier installation
          uploadedArtifact = { name, url: urlIndexHtml.split('?')[0] + '' };
        }

        loader.stop(
          `Uploaded ${uploadMessage} to ${color.bold(remoteBuildCache.name)}`
        );

        if (isJsonOutput) {
          console.log(JSON.stringify(uploadedArtifact, null, 2));
        } else {
          logger.log(`Artifact information:
- name: ${color.bold(color.blue(uploadedArtifact.name))}
- url: ${colorLink(uploadedArtifact.url)}`);
        }
      } catch (error) {
        throw new RnefError(
          `Failed to upload build to ${color.bold(remoteBuildCache.name)}`,
          { cause: error }
        );
      } finally {
        if (isAppDirectory && !isBinaryPathDirectory) {
          fs.unlinkSync(absoluteTarballPath);
        }
      }
      break;
    }
    case 'delete': {
      const deletedArtifacts = await remoteBuildCache.delete({
        artifactName,
        limit: args.all || args.allButLatest ? undefined : 1,
        skipLatest: args.allButLatest,
      });
      if (isJsonOutput) {
        console.log(JSON.stringify(deletedArtifacts, null, 2));
      } else {
        logger.log(
          `Deleted artifacts:
${deletedArtifacts
  .map(
    (artifact) =>
      `- name: ${color.bold(color.blue(artifact.name))}\n- url: ${colorLink(
        artifact.url
      )}`
  )
  .join('\n')}`
        );
      }
      break;
    }
    case 'get-provider-name': {
      console.log(remoteBuildCache.name);
      break;
    }
  }

  return null;
}

async function getInfoPlist(binaryPath: string) {
  const ipaFileName = path.basename(binaryPath);
  const appName = path.basename(ipaFileName, '.ipa');
  const ipaPath = binaryPath;
  const zip = new AdmZip(ipaPath);
  const infoPlistPath = `Payload/${appName}.app/Info.plist`;
  const infoPlistEntry = zip.getEntry(infoPlistPath);

  if (!infoPlistEntry) {
    throw new RnefError(
      `Info.plist not found at ${infoPlistPath} in ${ipaFileName}`
    );
  }
  const infoPlistBuffer = infoPlistEntry.getData();
  const tempPlistPath = path.join(os.tmpdir(), 'rnef-temp-info.plist');
  fs.writeFileSync(tempPlistPath, infoPlistBuffer);

  let version = 'unknown';
  let bundleIdentifier = 'unknown';
  try {
    await spawn('plutil', [
      '-convert',
      'json',
      '-o',
      tempPlistPath,
      tempPlistPath,
    ]);

    const jsonContent = fs.readFileSync(tempPlistPath, 'utf8');
    const infoPlistJson = JSON.parse(jsonContent) as Record<string, any>;

    version =
      infoPlistJson['CFBundleShortVersionString'] ||
      infoPlistJson['CFBundleVersion'] ||
      'unknown';
    bundleIdentifier = infoPlistJson['CFBundleIdentifier'];
  } finally {
    if (fs.existsSync(tempPlistPath)) {
      fs.unlinkSync(tempPlistPath);
    }
  }

  return { version, bundleIdentifier, appName, ipaFileName };
}

async function getBinaryBuffer(
  binaryPath: string,
  artifactName: string,
  localArtifactPath: string,
  args: Flags
) {
  const zip = new AdmZip();
  const isBinaryPathDirectory =
    !binaryPath.endsWith('.app') && fs.statSync(binaryPath).isDirectory();
  const isAppDirectory =
    binaryPath.endsWith('.app') && fs.statSync(binaryPath).isDirectory();
  const absoluteTarballPath =
    args.binaryPath ?? path.join(localArtifactPath, 'app.tar.gz');

  if (isBinaryPathDirectory) {
    // skip zipping, we're uploading a folder for ad-hoc builds
  } else if (isAppDirectory) {
    const appName = path.basename(binaryPath);
    if (args.binaryPath && !fs.existsSync(absoluteTarballPath)) {
      throw new RnefError(
        `No tarball found for "${artifactName}" in "${localArtifactPath}".`
      );
    }
    await tar.create(
      {
        file: absoluteTarballPath,
        cwd: path.dirname(binaryPath),
        gzip: true,
        filter: (filePath) => filePath.includes(appName),
      },
      [appName]
    );
    zip.addLocalFile(absoluteTarballPath);
  } else {
    zip.addLocalFile(binaryPath);
  }
  const buffer = zip.toBuffer();

  return { buffer, isBinaryPathDirectory, isAppDirectory, absoluteTarballPath };
}

function validateArgs(args: Flags, action: string) {
  if (!action) {
    // @todo make Commander handle this
    throw new RnefError(
      'Action is required. Available actions: list, list-all, download, upload, delete'
    );
  }
  if (action === 'list-all' || action === 'get-provider-name') {
    // return early as we don't need to validate name or platform
    // to list all artifacts or get provider name
    return;
  }
  if (args.name && (args.platform || args.traits)) {
    throw new RnefError(
      'Cannot use "--name" together with "--platform" or "--traits". Use either name or platform with traits'
    );
  }
  if (!args.name) {
    if ((args.platform && !args.traits) || (!args.platform && args.traits)) {
      throw new RnefError(
        'Either "--platform" and "--traits" must be provided together'
      );
    }
    if (!args.platform || !args.traits) {
      throw new RnefError(
        'Either "--name" or "--platform" and "--traits" must be provided'
      );
    }
  }
}

export const remoteCachePlugin =
  () =>
  (api: PluginApi): PluginOutput => {
    api.registerCommand({
      name: 'remote-cache',
      description: 'Manage remote cache',
      action: async (action: string, args: Flags) => {
        await remoteCache({
          action,
          args,
          remoteCacheProvider: (await api.getRemoteCacheProvider()) || null,
          projectRoot: api.getProjectRoot(),
          fingerprintOptions: api.getFingerprintOptions(),
        });
      },
      args: [
        {
          name: '[action]',
          description:
            'Select action, e.g. list, list-all, download, upload, delete, get-provider-name',
        },
      ],
      options: [
        {
          name: '--json',
          description: 'Output in JSON format',
        },
        {
          name: '--name <string>',
          description: 'Full artifact name',
        },
        {
          name: '--all',
          description:
            'List or delete all matching artifacts. Affects "list" and "delete" actions only',
        },
        {
          name: '--all-but-latest',
          description:
            'Delete all but the latest matching artifact. Affects "delete" action only',
        },
        {
          name: '-p, --platform <string>',
          description: 'Select platform, e.g. ios or android',
        },
        {
          name: '-t, --traits <list>',
          description: `Comma-separated traits that construct final artifact name. Traits for Android are: variant; for iOS: destination and configuration. 
Example iOS: --traits simulator,Release
Example Android: --traits debug`,
          parse: (val: string) => val.split(','),
        },
        {
          name: '--binary-path <string>',
          description: 'Path to the binary to upload',
        },
        {
          name: '--ad-hoc',
          description:
            'Upload IPA for ad-hoc distribution and installation from URL. Additionally uploads index.html and manifest.plist',
        },
      ],
    });

    return {
      name: 'internal_remote-cache',
      description: 'Manage remote cache',
    };
  };
