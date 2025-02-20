import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { logger } from '@rnef/tools';
import { ConfigTypeSchema } from './schema.js';
import { formatValidationError } from './utils.js';

export type PluginOutput = {
  name: string;
  description: string;
};

export type PluginApi = {
  registerCommand: (command: CommandType) => void;
  getProjectRoot: () => string;
  getReactNativeVersion: () => string;
  getReactNativePath: () => string;
  getPlatforms: () => { [platform: string]: object };
  getRemoteCacheProvider: () => SupportedRemoteCacheProviders | undefined;
};

type SupportedRemoteCacheProviders = 'github-actions';

type PluginType = (args: PluginApi) => PluginOutput;

type ArgValue = string | string[] | number | boolean;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ActionType<T = any> = (...args: T[]) => void;

type CommandType = {
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
};

type ConfigType = {
  root?: string;
  reactNativeVersion?: string;
  reactNativePath?: string;
  plugins?: PluginType[];
  platforms?: Record<string, PluginType>;
  commands?: Array<CommandType>;
  remoteCacheProvider?: SupportedRemoteCacheProviders;
};

type ConfigOutput = {
  commands?: Array<CommandType>;
};

const extensions = ['.js', '.ts', '.mjs'];

const importUp = async (dir: string, name: string): Promise<ConfigType> => {
  const filePath = path.join(dir, name);

  for (const ext of extensions) {
    const filePathWithExt = `${filePath}${ext}`;
    if (fs.existsSync(filePathWithExt)) {
      let config: ConfigType;

      if (ext === '.mjs') {
        config = await import(filePathWithExt).then((module) => module.default);
      } else {
        const require = createRequire(import.meta.url);
        config = require(filePathWithExt);
      }

      return config;
    }
  }

  const parentDir = path.dirname(dir);
  if (parentDir === dir) {
    throw new Error(`${name} not found in any parent directory of ${dir}`);
  }

  return importUp(parentDir, name);
};

export async function getConfig(
  dir: string = process.cwd()
): Promise<ConfigOutput> {
  let config = await importUp(dir, 'rnef.config');

  const { error } = ConfigTypeSchema.validate(config);

  if (error) {
    logger.error('Invalid config:\n' + formatValidationError(config, error));
    process.exit(1);
  }

  config = {
      root: dir,
      get reactNativePath() {
        return resolveReactNativePath(config.root || dir);
      },
      get reactNativeVersion() {
        return getReactNativeVersion(config.root || dir);
      },
      ...config,
  }

  const api = {
    registerCommand: (command: CommandType) => {
      config.commands = [...(config.commands || []), command];
    },
    getProjectRoot: () => config.root as string,
    getReactNativeVersion: () => config.reactNativeVersion as string,
    getReactNativePath: () => config.reactNativePath as string,
    getPlatforms: () => config.platforms as { [platform: string]: object },
    getRemoteCacheProvider: () => config.remoteCacheProvider,
  };

  if (config.plugins) {
    // plugins register commands
    for (const plugin of config.plugins) {
      plugin(api);
    }
  }

  if (config.platforms) {
    // platforms register commands and custom platform functionality (TBD)
    for (const platform in config.platforms) {
      config.platforms[platform](api);
    }
  }

  const outputConfig: ConfigOutput = {
    commands: config.commands ?? [],
  };

  return outputConfig;
}

function getReactNativeVersion(root: string) {
  try {
    const require = createRequire(import.meta.url);
    return JSON.parse(
      fs.readFileSync(
        path.join(
          require.resolve('react-native', { paths: [root] }),
          '..',
          'package.json'
        ),
        'utf-8'
      )
    ).version;
  } catch {
    return 'unknown';
  }
}

function resolveReactNativePath(root: string) {
  const require = createRequire(import.meta.url);
  return path.join(require.resolve('react-native', { paths: [root] }), '..');
}
