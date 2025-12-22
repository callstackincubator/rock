import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { PluginApi, PluginOutput } from '@rock-js/config';
import type { FingerprintSources, RemoteBuildCache } from '@rock-js/tools';
import {
  color,
  colorLink,
  formatArtifactName,
  getInfoPlist,
  getLocalArtifactPath,
  getLocalBinaryPath,
  handleDownloadResponse,
  handleUploadResponse,
  logger,
  relativeToCwd,
  RockError,
  spawn,
  spinner,
} from '@rock-js/tools';
import AdmZip from 'adm-zip';
import * as tar from 'tar';
import {
  templateIndexHtmlAndroid,
  templateIndexHtmlIOS,
  templateManifestPlist,
} from '../adHocTemplates.js';
import {
  promptRemoteCacheProvider,
  promptRemoteCacheProviderArgs,
} from '../utils/prompts.js';

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
              artifact.name.startsWith(`rock-${platform}-${traits.join('-')}`),
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
        artifact.url,
      )}`,
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
        `Downloading cached build from ${color.bold(remoteBuildCache.name)}`,
      );
      await handleDownloadResponse(
        response,
        localArtifactPath,
        (progress, totalMB) => {
          loader.message(
            `Downloading cached build from ${color.bold(
              remoteBuildCache.name,
            )} (${progress}% of ${totalMB} MB)`,
          );
        },
      );
      const binaryPath = getLocalBinaryPath(localArtifactPath);
      loader.stop(
        `Downloaded cached build from ${color.bold(remoteBuildCache.name)}`,
      );
      if (!binaryPath) {
        throw new RockError(`Failed to save binary for "${artifactName}".`);
      }
      if (isJsonOutput) {
        console.log(
          JSON.stringify({ name: artifactName, path: binaryPath }, null, 2),
        );
      } else {
        logger.log(
          `Artifact information:
- name: ${color.bold(color.blue(artifactName))}
- path: ${colorLink(relativeToCwd(binaryPath))}`,
        );
      }
      break;
    }
    case 'upload': {
      const localArtifactPath = getLocalArtifactPath(artifactName);
      const binaryPath =
        args.binaryPath ?? getLocalBinaryPath(localArtifactPath);
      if (!binaryPath) {
        throw new RockError(`No binary found for "${artifactName}".`);
      }
      const buffer = await getBinaryBuffer(
        binaryPath,
        artifactName,
        localArtifactPath,
        args,
      );

      const isArtifactIPA = args.binaryPath?.endsWith('.ipa');
      const isArtifactAPK = args.binaryPath?.endsWith('.apk');

      try {
        let uploadedArtifact;
        const appFileName = path.basename(binaryPath);
        const appName = appFileName.replace(/\.[^/.]+$/, '');

        const uploadContent: {
          messagePrefix: string;
          artifactName: string | undefined;
        } = {
          messagePrefix: 'build',
          artifactName: undefined,
        };

        if (args.adHoc && isArtifactIPA) {
          uploadContent.messagePrefix = 'IPA, index.html and manifest.plist';
          uploadContent.artifactName = `ad-hoc/${artifactName}/${appName}.ipa`;
        } else if (args.adHoc && isArtifactAPK) {
          uploadContent.messagePrefix = 'APK, index.html';
          uploadContent.artifactName = `ad-hoc/${artifactName}/${appName}.apk`;
        }

        const { name, url, getResponse } = await remoteBuildCache.upload({
          artifactName,
          uploadArtifactName: uploadContent.artifactName,
        });

        const uploadMessage = `${uploadContent.messagePrefix} to ${color.bold(remoteBuildCache.name)}`;

        const loader = spinner({ silent: isJsonOutput });
        loader.start(`Uploading ${uploadMessage}`);
        await handleUploadResponse(getResponse, buffer, (progress, totalMB) => {
          loader.message(
            `Uploading ${uploadMessage} (${progress}% of ${totalMB} MB)`,
          );
        });

        uploadedArtifact = { name, url };

        // Upload index.html and manifest.plist for iOS ad-hoc distribution
        if (args.adHoc && isArtifactIPA) {
          const { version, bundleIdentifier } =
            await getInfoPlistFromIpa(binaryPath);
          const { url: urlIndexHtml, getResponse: getResponseIndexHtml } =
            await remoteBuildCache.upload({
              artifactName,
              uploadArtifactName: `ad-hoc/${artifactName}/index.html`,
            });
          getResponseIndexHtml(
            Buffer.from(
              templateIndexHtmlIOS({ appName, bundleIdentifier, version }),
            ),
            'text/html',
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
                ipaName: appFileName,
                bundleIdentifier,
                platformIdentifier: 'com.apple.platform.iphoneos',
              }),
            ),
          );

          // For ad-hoc distribution, we want the url to point to the index.html for easier installation
          uploadedArtifact = { name, url: urlIndexHtml.split('?')[0] + '' };
        }

        // Upload index.html for Android ad-hoc distribution
        if (args.adHoc && isArtifactAPK) {
          const { version, packageName } = await getManifestFromApk(binaryPath);
          const { url: urlIndexHtml, getResponse: getResponseIndexHtml } =
            await remoteBuildCache.upload({
              artifactName,
              uploadArtifactName: `ad-hoc/${artifactName}/index.html`,
            });
          getResponseIndexHtml(
            Buffer.from(
              templateIndexHtmlAndroid({ appName, packageName, version }),
            ),
            'text/html',
          );

          // For ad-hoc distribution, we want the url to point to the index.html for easier installation
          uploadedArtifact = { name, url: urlIndexHtml.split('?')[0] + '' };
        }

        loader.stop(`Uploaded ${uploadMessage}`);

        if (isJsonOutput) {
          console.log(JSON.stringify(uploadedArtifact, null, 2));
        } else {
          logger.log(`Artifact information:
- name: ${color.bold(color.blue(uploadedArtifact.name))}
- url: ${colorLink(uploadedArtifact.url)}`);
        }
      } catch (error) {
        throw new RockError(
          `Failed to upload build to ${color.bold(remoteBuildCache.name)}`,
          { cause: error },
        );
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
        artifact.url,
      )}`,
  )
  .join('\n')}`,
        );
      }
      break;
    }
    case 'get-provider-name': {
      console.log(remoteBuildCache.name);
      break;
    }
    case 'setup': {
      if (remoteBuildCache) {
        console.log(
          `You already have a remote build cache setup with ${remoteBuildCache.name}`,
        );
        break;
      }

      // Prompt duplicates from https://github.com/callstack/rock/blob/626ccf8f585afeec323e17727bc541ddbed829bf/packages/create-app/src/lib/utils/prompts.ts
      const provider = await promptRemoteCacheProvider();
      const args = provider
        ? await promptRemoteCacheProviderArgs(provider)
        : null;

      // Setup remote build cache
      // await remoteBuildCache.setup(providerName, args);
      console.log(`Remote build cache setup with ${provider}: ${args}`);
      break;
    }
  }

  return null;
}

async function getInfoPlistFromIpa(binaryPath: string) {
  const ipaFileName = path.basename(binaryPath);
  const appName = path.basename(ipaFileName, '.ipa');
  const ipaPath = binaryPath;
  const zip = new AdmZip(ipaPath);
  const infoPlistPath = `Payload/${appName}.app/Info.plist`;
  const infoPlistEntry = zip.getEntry(infoPlistPath);

  if (!infoPlistEntry) {
    throw new RockError(
      `Info.plist not found at ${infoPlistPath} in ${ipaFileName}`,
    );
  }
  const infoPlistBuffer = infoPlistEntry.getData();
  const tempPlistPath = path.join(os.tmpdir(), 'rock-temp-info.plist');
  fs.writeFileSync(tempPlistPath, infoPlistBuffer);
  const infoPlistJson = await getInfoPlist(tempPlistPath);
  fs.unlinkSync(tempPlistPath);
  return {
    version:
      infoPlistJson?.['CFBundleShortVersionString'] ||
      infoPlistJson?.['CFBundleVersion'] ||
      'unknown',
    bundleIdentifier: infoPlistJson?.['CFBundleIdentifier'] || 'unknown',
  };
}

function findAapt() {
  const sdkRoot =
    process.env['ANDROID_HOME'] || process.env['ANDROID_SDK_ROOT'];

  if (!sdkRoot) {
    throw new RockError(
      'ANDROID_HOME or ANDROID_SDK_ROOT environment variable is not set. Please follow instructions at: https://reactnative.dev/docs/set-up-your-environment?platform=android',
    );
  }

  const buildToolsPath = path.join(sdkRoot, 'build-tools');
  const versions = fs.readdirSync(buildToolsPath);

  for (const version of versions) {
    const aaptPath = path.join(buildToolsPath, version, 'aapt');
    if (fs.existsSync(aaptPath)) {
      logger.debug(`Found aapt at: ${aaptPath}`);
      return aaptPath;
    }
  }

  throw new RockError(
    `"aapt" not found in Android Build-Tools directory: ${colorLink(buildToolsPath)}
Please follow instructions at: https://reactnative.dev/docs/set-up-your-environment?platform=android`,
  );
}

async function getManifestFromApk(binaryPath: string) {
  const apkFileName = path.basename(binaryPath, '.apk');

  try {
    const aaptPath = findAapt();

    const { stdout: output } = await spawn(
      aaptPath,
      ['dump', 'badging', binaryPath],
      { stdio: 'pipe' },
    );

    const packageMatch = output?.match(/package: name='([^']+)'/);
    const versionMatch = output?.match(/versionName='([^']+)'/);

    const packageName = packageMatch?.[1] || apkFileName;
    const version = versionMatch?.[1] || '1.0';

    logger.debug(
      `Extracted APK manifest - package: ${packageName}, version: ${version}`,
    );

    return { packageName, version };
  } catch (error) {
    logger.debug('Failed to parse APK manifest, using fallback', error);
    return {
      packageName: apkFileName,
      version: '1.0',
    };
  }
}

async function getBinaryBuffer(
  binaryPath: string,
  artifactName: string,
  localArtifactPath: string,
  args: Flags,
) {
  // For ad-hoc, we don't need to zip the binary, we just upload the IPA
  if (args.adHoc) {
    return fs.readFileSync(binaryPath);
  }
  const zip = new AdmZip();
  const isAppDirectory =
    binaryPath.endsWith('.app') && fs.statSync(binaryPath).isDirectory();
  const absoluteTarballPath =
    args.binaryPath ?? path.join(localArtifactPath, 'app.tar.gz');

  if (isAppDirectory) {
    const appDirectoryName = path.basename(binaryPath);
    if (args.binaryPath && !fs.existsSync(absoluteTarballPath)) {
      throw new RockError(
        `No tarball found for "${artifactName}" in "${localArtifactPath}".`,
      );
    }
    await tar.create(
      {
        file: absoluteTarballPath,
        cwd: path.dirname(binaryPath),
        gzip: true,
        filter: (filePath) => filePath.includes(appDirectoryName),
      },
      [appDirectoryName],
    );
    zip.addLocalFile(absoluteTarballPath);
  } else {
    zip.addLocalFile(binaryPath);
  }
  const buffer = zip.toBuffer();

  if (isAppDirectory) {
    fs.unlinkSync(absoluteTarballPath);
  }

  return buffer;
}

function validateArgs(args: Flags, action: string) {
  if (!action) {
    // @todo make Commander handle this
    throw new RockError(
      'Action is required. Available actions: list, list-all, download, upload, delete',
    );
  }
  if (action === 'list-all' || action === 'get-provider-name') {
    // return early as we don't need to validate name or platform
    // to list all artifacts or get provider name
    return;
  }
  if (args.name && (args.platform || args.traits)) {
    throw new RockError(
      'Cannot use "--name" together with "--platform" or "--traits". Use either name or platform with traits',
    );
  }
  if (!args.name) {
    if ((args.platform && !args.traits) || (!args.platform && args.traits)) {
      throw new RockError(
        'Either "--platform" and "--traits" must be provided together',
      );
    }
    if (!args.platform || !args.traits) {
      throw new RockError(
        'Either "--name" or "--platform" and "--traits" must be provided',
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
            'Select action, e.g. setup, list, list-all, download, upload, delete, get-provider-name',
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
          description:
            'Select platform, e.g. ios, android, or harmony (experimental)',
        },
        {
          name: '-t, --traits <list>',
          description: `Comma-separated traits that construct final artifact name. Traits for Android are: variant; for iOS: destination and configuration.
Example iOS: --traits simulator,Release
Example Android: --traits debug
Example Harmony: --traits debug`,
          parse: (val: string) => val.split(','),
        },
        {
          name: '--binary-path <string>',
          description: 'Path to the binary to upload',
        },
        {
          name: '--ad-hoc',
          description:
            'Upload IPA or APK for ad-hoc distribution and installation from URL. For iOS: uploads IPA, index.html and manifest.plist. For Android: uploads APK and index.html',
        },
      ],
    });

    return {
      name: 'internal_remote-cache',
      description: 'Manage remote cache',
    };
  };
