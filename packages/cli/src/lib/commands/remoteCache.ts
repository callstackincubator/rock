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

type Flags =
  | {
      source?: string;
      name: string;
    }
  | {
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

  const artifactName =
    'name' in args
      ? args.name
      : await formatArtifactName({
          platform: args.platform,
          traits: args.traits,
          root: projectRoot,
          fingerprintOptions,
        });

  switch (action) {
    case 'list': {
      const loader = spinner();
      loader.start(`Listing artifacts for "${artifactName}"`);
      const artifacts = await remoteBuildCache.list({ artifactName });
      if (artifacts) {
        loader.stop(
          `Available artifacts: 
${artifacts
  .map((artifact) => `◾︎ ${artifact.name}: ${artifact.downloadUrl}`)
  .join('\n')}`
        );
      } else {
        loader.stop(`No artifact found for "${artifactName}".`);
      }
      break;
    }
    case 'list-all': {
      const loader = spinner();
      loader.start(`Listing all artifacts`);
      const artifacts = await remoteBuildCache.list({
        artifactName: undefined,
      });
      if (artifacts) {
        loader.stop(
          `Available artifacts: 
${artifacts.map((artifact) => `◾︎  ${artifact.name}`).join('\n')}`
        );
      } else {
        loader.stop(`No artifact found for "${artifactName}".`);
      }
      break;
    }
    case 'download': {
      const loader = spinner();
      loader.start(`Downloading artifact "${artifactName}"`);
      const artifacts = await remoteBuildCache.list({ artifactName, limit: 1 });
      if (!artifacts) {
        loader.stop(`No artifact found for "${artifactName}".`);
        return null;
      }
      const fetchedBuild = await remoteBuildCache.download({
        artifact: artifacts[0],
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
