import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';

export type PluginOutput = {
  name: string;
  description: string;
};

export type PluginApi<Args> = {
  registerCommand: (command: CommandType<Args>) => void;
  getProjectRoot: () => string;
};

type PluginType<Args> = (args: PluginApi<Args>) => PluginOutput;

type ArgValue = string | boolean | string[];

type CommandType<Args> = {
  name: string;
  description: string;
  action: (args: Args) => void;
  options?: Array<{
    name: string;
    description: string;
    default?: ArgValue | undefined;
    parse?: (value: string, previous: ArgValue) => ArgValue;
  }>;
};

type ConfigType<Args> = {
  root?: string;
  plugins?: Record<string, PluginType<Args>>;
  platforms?: Record<string, PluginType<Args>>;
  commands?: Array<CommandType<Args>>;
};

type ConfigOutput<Args> = {
  commands?: Array<CommandType<Args>>;
};

const extensions = ['.js', '.ts', '.mjs'];

const importUp = async <T>(dir: string, name: string): Promise<T> => {
  const filePath = path.join(dir, name);

  for (const ext of extensions) {
    const filePathWithExt = `${filePath}${ext}`;
    if (fs.existsSync(filePathWithExt)) {
      if (ext === '.mjs') {
        return import(filePathWithExt).then((module) => module.default);
      } else {
        const require = createRequire(import.meta.url);
        return require(filePathWithExt);
      }
    }
  }

  const parentDir = path.dirname(dir);
  if (parentDir === dir) {
    throw new Error(`${name} not found in any parent directory of ${dir}`);
  }

  return importUp(parentDir, name);
};

export async function getConfig<Args>(
  dir: string = process.cwd()
): Promise<ConfigOutput<Args>> {
  const config = await importUp<ConfigType<Args>>(dir, 'rnef.config');

  if (!config.root) {
    config.root = process.cwd();
  }

  const api = {
    registerCommand: (command: CommandType<Args>) => {
      config.commands = [...(config.commands || []), command];
    },
    getProjectRoot: () => config.root as string,
  };

  if (config.plugins) {
    // plugins register commands
    for (const plugin in config.plugins) {
      config.plugins[plugin](api);
    }
  }

  if (config.platforms) {
    // platforms register commands and custom platform functionality (TBD)
    for (const platform in config.platforms) {
      config.platforms[platform](api);
    }
  }

  const outputConfig: ConfigOutput<Args> = {
    commands: config.commands ?? [],
  };

  return outputConfig;
}
