import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { FingerprintSources, RemoteBuildCache } from '@rock-js/tools';
import { colorLink, getReactNativeVersion, logger } from '@rock-js/tools';
import type { ValidationError } from 'joi';
import { ConfigTypeSchema } from './schema.js';
import { formatValidationError } from './utils.js';

export type PluginOutput = {
  name: string;
  description: string;
};

export type DevServerArgs = {
  interactive: boolean;
  clientLogs: boolean;
  port?: string;
  host?: string;
  https?: boolean;
  resetCache?: boolean;
  devServer?: boolean;
  platforms?: string[];
  [key: string]: unknown;
};

export type StartDevServerArgs = {
  root: string;
  args: DevServerArgs;
  reactNativeVersion: string;
  reactNativePath: string;
  platforms: Record<string, object>;
};

type StartDevServerFunction = (options: StartDevServerArgs) => Promise<void>;

export type BundlerPluginOutput = {
  name: string;
  description: string;
  start: StartDevServerFunction;
};

export type PlatformOutput = PluginOutput & {
  autolinkingConfig: { project: Record<string, unknown> | undefined };
};

export type PluginApi = {
  registerCommand: (command: CommandType) => void;
  getProjectRoot: () => string;
  getReactNativeVersion: () => string;
  getReactNativePath: () => string;
  getPlatforms: () => { [platform: string]: object };
  getRemoteCacheProvider: () => Promise<
    null | undefined | (() => RemoteBuildCache)
  >;
  getFingerprintOptions: () => FingerprintSources;
  getBundlerStart: () => ({ args }: { args: DevServerArgs }) => void;
};

type PluginType = (args: PluginApi) => PluginOutput;
type BundlerPluginType = (args: PluginApi) => BundlerPluginOutput;
type PlatformType = (args: PluginApi) => PlatformOutput;

type ArgValue = string | string[] | boolean;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ActionType<T = any> = (...args: T[]) => void | Promise<void>;

export type CommandType = {
  name: string;
  description: string;
  action: ActionType;
  /** Positional arguments */
  args?: Array<{
    name: string;
    description: string;
    default?: ArgValue | undefined;
  }>;
  /** Flags */
  options?: Array<{
    name: string;
    description: string;
    default?: ArgValue | undefined;
    parse?: (value: string, previous: ArgValue) => ArgValue;
  }>;
  /** Internal property to assign plugin name to particualr commands  */
  __origin?: string;
};

export type ConfigType = {
  root?: string;
  reactNativeVersion?: string;
  reactNativePath?: string;
  bundler?: BundlerPluginType;
  plugins?: PluginType[];
  platforms?: Record<string, PlatformType>;
  commands?: Array<CommandType>;
  remoteCacheProvider?: null | 'github-actions' | (() => RemoteBuildCache);
  fingerprint?: {
    extraSources?: string[];
    ignorePaths?: string[];
    env?: string[];
  };
};

export type ConfigOutput = {
  root: string;
  commands?: Array<CommandType>;
  platforms?: Record<string, PlatformOutput>;
  bundler?: BundlerPluginOutput;
} & PluginApi;

const extensions = ['.js', '.ts', '.mjs'];

const importUp = async (
  dir: string,
  name: string,
): Promise<{
  config: ConfigType;
  filePathWithExt: string;
  configDir: string;
}> => {
  const filePath = path.join(dir, name);

  for (const ext of extensions) {
    const filePathWithExt = `${filePath}${ext}`;
    if (fs.existsSync(filePathWithExt)) {
      let config: ConfigType;

      if (ext === '.mjs') {
        config = await import(pathToFileURL(filePathWithExt).href).then(
          (module) => module.default,
        );
      } else {
        const require = createRequire(import.meta.url);
        config = require(filePathWithExt);
      }

      return { config, filePathWithExt, configDir: dir };
    }
  }

  const parentDir = path.dirname(dir);
  if (parentDir === dir) {
    throw new Error(`${name} not found in any parent directory of ${dir}`);
  }

  return importUp(parentDir, name);
};

export async function getConfig(
  dir: string,
  internalPlugins: Array<
    (ownConfig: {
      platforms: ConfigOutput['platforms'];
      root: ConfigOutput['root'];
    }) => PluginType
  >,
): Promise<ConfigOutput> {
  const { config, filePathWithExt, configDir } = await importUp(
    dir,
    'rock.config',
  );

  const { error, value: validatedConfig } = ConfigTypeSchema.validate(
    config,
  ) as {
    error: ValidationError | null;
    value: ConfigType;
  };

  if (error) {
    logger.error(
      `Invalid ${colorLink(
        path.relative(configDir, filePathWithExt),
      )} file:\n` + formatValidationError(config, error),
    );
    process.exit(1);
  }

  const projectRoot = validatedConfig.root
    ? path.resolve(configDir, validatedConfig.root)
    : configDir;

  if (!fs.existsSync(projectRoot)) {
    logger.error(
      `Project root ${projectRoot} does not exist. Please check your config file.`,
    );
    process.exit(1);
  }

  let bundler: BundlerPluginOutput | undefined;

  const api = {
    registerCommand: (command: CommandType) => {
      validatedConfig.commands = [...(validatedConfig.commands || []), command];
    },
    getProjectRoot: () => projectRoot,
    getReactNativeVersion: () => getReactNativeVersion(projectRoot),
    getReactNativePath: () => resolveReactNativePath(projectRoot),
    getPlatforms: () =>
      validatedConfig.platforms as { [platform: string]: object },
    getRemoteCacheProvider: async () => {
      // special case for github-actions
      if (validatedConfig.remoteCacheProvider === 'github-actions') {
        logger.warnOnce('github-actions')(
          `Using shorthand "github-actions" as "remoteCacheProvider" value in ${colorLink(
            'rock.config.mjs',
          )} is deprecated. It will be removed in future releases. 
Please use "@rock-js/provider-github" plugin explicitly instead.
Read more: ${colorLink('https://rockjs.dev/docs/configuration#github-actions-provider')}`,
        );
        const { providerGitHub } = await import('@rock-js/provider-github');
        return providerGitHub();
      }
      return validatedConfig.remoteCacheProvider;
    },
    getFingerprintOptions: () =>
      validatedConfig.fingerprint as FingerprintSources,
    getBundlerStart:
      () =>
      ({ args }: { args: DevServerArgs }) => {
        return bundler?.start({
          root: api.getProjectRoot(),
          args,
          reactNativeVersion: api.getReactNativeVersion(),
          reactNativePath: api.getReactNativePath(),
          platforms: api.getPlatforms(),
        });
      },
  };

  const platforms: Record<string, PlatformOutput> = {};
  if (validatedConfig.platforms) {
    // platforms register commands and custom platform functionality (TBD)
    for (const platform in validatedConfig.platforms) {
      const platformOutput = validatedConfig.platforms[platform](api);
      platforms[platform] = platformOutput;
    }
  }

  if (validatedConfig.plugins) {
    // plugins register commands
    for (const plugin of validatedConfig.plugins) {
      assignOriginToCommand(plugin, api, validatedConfig);
    }
  }

  if (validatedConfig.bundler) {
    bundler = assignOriginToCommand(
      validatedConfig.bundler,
      api,
      validatedConfig,
    ) as BundlerPluginOutput;
  }

  for (const internalPlugin of internalPlugins) {
    assignOriginToCommand(
      internalPlugin({ root: projectRoot, platforms }),
      api,
      validatedConfig,
    );
  }

  const outputConfig: ConfigOutput = {
    root: projectRoot,
    commands: validatedConfig.commands ?? [],
    platforms: platforms ?? {},
    bundler,
    ...api,
  };

  return outputConfig;
}

function resolveReactNativePath(root: string) {
  const require = createRequire(import.meta.url);
  return path.join(require.resolve('react-native', { paths: [root] }), '..');
}

/**
 *
 * Assigns __origin property to each command in the config for later use in error handling.
 */
function assignOriginToCommand(
  plugin: PluginType | BundlerPluginType,
  api: PluginApi,
  config: ConfigType,
) {
  const len = config.commands?.length ?? 0;
  const { name, ...rest } = plugin(api);
  const newlen = config.commands?.length ?? 0;
  for (let i = len; i < newlen; i++) {
    if (config.commands?.[i]) {
      config.commands[i].__origin = name;
    }
  }
  return { name, ...rest };
}
