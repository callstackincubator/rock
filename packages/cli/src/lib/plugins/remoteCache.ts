import type { PluginApi, PluginOutput } from '@rnef/config';
import type {
  RemoteBuildCache,
  SupportedRemoteCacheProviders,
} from '@rnef/tools';
import {
  createRemoteBuildCache,
  formatArtifactName,
  getLocalArtifactPath,
  getLocalBinaryPath,
  handleDownloadResponse,
  RnefError,
  spinner,
} from '@rnef/tools';

type Flags = {
  platform?: 'ios' | 'android';
  traits?: string[];
  name?: string;
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
    | { (): RemoteBuildCache };
  projectRoot: string;
  fingerprintOptions: { extraSources: string[]; ignorePaths: string[] };
}) {
  const remoteBuildCache = await createRemoteBuildCache(remoteCacheProvider);
  if (!remoteBuildCache) {
    return null;
  }

  const artifactName =
    args.name ??
    (await formatArtifactName({
      platform: args.platform,
      traits: args.traits,
      root: projectRoot,
      fingerprintOptions,
    }));

  switch (action) {
    case 'list': {
      const artifacts = await remoteBuildCache.list({ artifactName });
      if (artifacts) {
        console.log(artifacts[0]);
      } else {
        throw new RnefError(`No artifacts found for "${artifactName}".`);
      }
      break;
    }
    case 'list-all': {
      const artifacts = await remoteBuildCache.list({
        artifactName: undefined,
      });
      if (artifacts) {
        const platform = args.platform;
        if (platform) {
          console.log(
            artifacts.filter((artifact) =>
              artifact.name.startsWith(`rnef-${platform}`)
            )
          );
        } else {
          console.log(artifacts);
        }
      } else {
        throw new RnefError(`No artifacts found.`);
      }
      break;
    }
    case 'download': {
      const localArtifactPath = getLocalArtifactPath(artifactName);
      const response = await remoteBuildCache.download({ artifactName });
      const loader = spinner();
      await handleDownloadResponse(
        response,
        localArtifactPath,
        artifactName,
        loader
      );
      const binaryPath = getLocalBinaryPath(localArtifactPath);
      if (!binaryPath) {
        throw new RnefError(`No binary found for "${artifactName}".`);
      }
      console.log(binaryPath);
      break;
    }
    case 'upload': {
      const uploadedArtifact = await remoteBuildCache.upload({ artifactName });
      console.log(uploadedArtifact);
      break;
    }
    case 'delete': {
      const deletedArtifacts = await remoteBuildCache.delete({ artifactName });
      console.log(deletedArtifacts);
      break;
    }
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
          name: '--name <string>',
          description: 'Full artifact name',
        },
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
