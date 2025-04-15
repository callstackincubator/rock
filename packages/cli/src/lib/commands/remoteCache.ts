import type { PluginApi, PluginOutput } from '@rnef/config';
import type {
  RemoteBuildCache,
  SupportedRemoteCacheProviders,
} from '@rnef/tools';
import {
  createRemoteBuildCache,
  fetchCachedBuild,
  findDirectoriesWithPattern,
  findFilesWithPattern,
  formatArtifactName,
  logger,
} from '@rnef/tools';

type Flags = {
  platform: 'ios' | 'android';
  traits: string[];
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
  remoteCacheProvider:
    | SupportedRemoteCacheProviders
    | null
    | { new (): RemoteBuildCache };
  projectRoot: string;
  fingerprintOptions: { extraSources: string[]; ignorePaths: string[] };
}) {
  const remoteBuildCache = await createRemoteBuildCache(remoteCacheProvider);
  if (!remoteBuildCache) {
    return null;
  }

  const artifactName = await formatArtifactName({
    platform: args.platform,
    traits: args.traits,
    root: projectRoot,
    fingerprintOptions,
  });
  switch (action) {
    case 'query': {
      const artifact = await remoteBuildCache.query({ artifactName });
      console.log({ artifact });
      break;
    }
    case 'download': {
      const cachedBuild = await fetchCachedBuild({
        artifactName,
        remoteCacheProvider,
        findBinary:
          args.platform === 'ios'
            ? (path) =>
                findBinaryIos(args.traits[0] as 'simulator' | 'device', path)
            : findBinaryAndroid,
      });
      console.log({ cachedBuild });
      break;
    }
    case 'upload':
      console.log('upload');
      break;
    case 'delete':
      console.log('delete');
      break;
  }

  return null;
}

function findBinaryAndroid(path: string): string | null {
  const apks = findFilesWithPattern(path, /\.apk$/);
  if (apks.length > 0) {
    return apks[0];
  }
  const aabs = findFilesWithPattern(path, /\.aab$/);
  if (aabs.length > 0) {
    return aabs[0];
  }
  return null;
}

function findBinaryIos(
  distribution: 'simulator' | 'device',
  path: string
): string | null {
  return distribution === 'device'
    ? findDeviceBinary(path)
    : findSimulatorBinary(path);
}

function findSimulatorBinary(path: string): string | null {
  const apps = findDirectoriesWithPattern(path, /\.app$/);
  if (apps.length === 0) {
    return null;
  }

  logger.debug(
    `Found simulator binaries (*.app): ${apps.join(
      ', '
    )}. Picking the first one: ${apps[0]}.`
  );
  return apps[0];
}

function findDeviceBinary(path: string): string | null {
  const ipas = findFilesWithPattern(path, /\.ipa$/);
  if (ipas.length === 0) {
    return null;
  }

  logger.debug(
    `Found device binaries (*.ipa): ${ipas.join(
      ', '
    )}. Picking the first one: ${ipas[0]}.`
  );
  return ipas[0];
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
          remoteCacheProvider: api.getRemoteCacheProvider() || null,
          projectRoot: api.getProjectRoot(),
          fingerprintOptions: api.getFingerprintOptions(),
        });
      },
      args: [
        {
          name: '<action>',
          description: 'Select action, e.g. query, download, upload, delete',
        },
      ],
      options: [
        {
          name: '-p, --platform <string>',
          description: 'Select platform, e.g. ios or android',
        },
        {
          name: '--traits <list>',
          description: `Comma-separated traits that construct final artifact name. Traits for Android are: variant; for iOS: destination and configuration. 
Example iOS: --traits simulator,Release
Example Android: --traits debug`,
          parse: (val: string) => val.split(','),
        },
      ],
    });

    return {
      name: 'remote-cache',
      description: 'Manage remote cache',
    };
  };
