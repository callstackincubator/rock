import type { PluginApi, PluginOutput } from '@rnef/config';
import type {
  RemoteBuildCache,
  SupportedRemoteCacheProviders,
} from '@rnef/tools';
import {
  createRemoteBuildCache,
  fetchCachedBuild,
  formatArtifactName,
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
