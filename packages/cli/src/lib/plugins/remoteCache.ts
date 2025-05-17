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
  logger,
  RnefError,
  spinner,
} from '@rnef/tools';

type Flags = {
  platform?: 'ios' | 'android';
  traits?: string[];
  name?: string;
  json?: boolean;
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
  const isJsonOutput = args.json;
  const remoteBuildCache = await createRemoteBuildCache(remoteCacheProvider);
  if (!remoteBuildCache) {
    return null;
  }

  validateArgs(args, action);

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
      const artifact = artifacts[0];
      if (artifact) {
        if (isJsonOutput) {
          console.log(JSON.stringify(artifact, null, 2));
        } else {
          logger.log(`- name: ${artifact.name}
  - url: ${artifact.url}`);
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
        output.forEach((artifact) => {
          logger.log(`- name: ${artifact.name}
- url: ${artifact.url}`);
        });
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
      if (isJsonOutput) {
        console.log(
          JSON.stringify({ name: artifactName, path: binaryPath }, null, 2)
        );
      } else {
        logger.log(`- name: ${artifactName}
- path: ${binaryPath}`);
      }
      break;
    }
    case 'upload': {
      const uploadedArtifact = await remoteBuildCache.upload({ artifactName });
      if (isJsonOutput) {
        console.log(JSON.stringify(uploadedArtifact, null, 2));
      } else {
        logger.log(`- name: ${uploadedArtifact.name}
- url: ${uploadedArtifact.url}`);
      }
      break;
    }
    case 'delete': {
      const deletedArtifacts = await remoteBuildCache.delete({ artifactName });
      if (isJsonOutput) {
        console.log(JSON.stringify(deletedArtifacts, null, 2));
      } else {
        logger.log(
          deletedArtifacts
            .map(
              (artifact) => `- name: ${artifact.name}
- url: ${artifact.url}`
            )
            .join('\n')
        );
      }
      break;
    }
  }

  return null;
}

function validateArgs(args: Flags, action: string) {
  if (!action) {
    // @todo make Commander handle this
    throw new RnefError(
      'Action is required. Available actions: list, list-all, download, upload, delete'
    );
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
          remoteCacheProvider: api.getRemoteCacheProvider() || null,
          projectRoot: api.getProjectRoot(),
          fingerprintOptions: api.getFingerprintOptions(),
        });
      },
      args: [
        {
          name: '[action]',
          description: 'Select action, e.g. query, download, upload, delete',
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
      ],
    });

    return {
      name: 'internal_remote-cache',
      description: 'Manage remote cache',
    };
  };
