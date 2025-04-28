import type { PluginApi, PluginOutput } from '@rnef/config';
import type {
  RemoteBuildCache,
  SupportedRemoteCacheProviders,
} from '@rnef/tools';
import {
  createRemoteBuildCache,
  formatArtifactName,
  logger,
  spinner,
} from '@rnef/tools';

type Flags = {
  platform: 'ios' | 'android';
  traits: string[];
  source?: string;
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
      if (artifact) {
        logger.log(`Available artifact: ${artifact.name}`);
      } else {
        logger.log(`No artifact found for "${artifactName}".`);
      }
      break;
    }
    case 'download': {
      const loader = spinner();
      loader.start(`Downloading artifact "${artifactName}"`);
      const artifact = await remoteBuildCache.query({ artifactName });
      if (!artifact) {
        loader.stop(`No artifact found for "${artifactName}".`);
        return null;
      }
      const fetchedBuild = await remoteBuildCache.download({
        artifact,
        loader,
      });
      loader.stop(`Downloaded artifact "${artifactName}"`);
      logger.log(`Artifact path: ${fetchedBuild.path}`);
      break;
    }
    case 'upload': {
      const loader = spinner();
      if (!args.source) {
        loader.stop(`Missing required "--source" parameter for upload action.`);
        return null;
      }
      loader.start(`Uploading artifact "${artifactName}"`);
      const uploadedArtifact = await remoteBuildCache.upload({
        artifactPath: args.source,
        artifactName,
        loader,
      });
      loader.stop(
        `Uploaded artifact "${artifactName}" to ${uploadedArtifact?.downloadUrl}`
      );
      break;
    }
    case 'delete': {
      const loader = spinner();
      const success = await remoteBuildCache.delete({
        artifactName,
        loader,
      });

      if (!success) {
        loader.stop(`Failed to delete artifact "${artifactName}".`);
      }
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
        {
          name: '--source <path>',
          description:
            'Path to a single binary file to upload as an artifact (not a directory)',
        },
      ],
    });

    return {
      name: 'remote-cache',
      description: 'Manage remote cache',
    };
  };
