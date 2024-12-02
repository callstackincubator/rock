import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';

export type PluginOutput = {
  name: string;
  description: string;
};

export type PluginApi = {
  registerCommand: (command: CommandType) => void;
  getProjectRoot: () => string;
};

type PluginType = (args: PluginApi) => PluginOutput;

type ArgValue = string | boolean | string[];

type CommandType = {
  name: string;
  description: string;
  action: <Args>(args: Args) => void;
  options?: Array<{
    name: string;
    description: string;
    default?: ArgValue | undefined;
    parse?: (value: string, previous: ArgValue) => ArgValue;
  }>;
};

type ConfigType = {
  root?: string;
  plugins?: Record<string, PluginType>;
  platforms?: Record<string, PluginType>;
  commands?: Array<CommandType>;
};

type ConfigOutput = {
  commands?: Array<CommandType>;
};

const extensions = ['.js', '.ts', '.mjs'];

const importUp = async <T>(dir: string, name: string): Promise<T> => {
  const filePath = path.join(dir, name);

  for (const ext of extensions) {
    const filePathWithExt = `${filePath}${ext}`;
    if (fs.existsSync(filePathWithExt)) {
      let config: T;

      if (ext === '.mjs') {
        config = await import(filePathWithExt).then((module) => module.default);
      } else {
        const require = createRequire(import.meta.url);
        config = require(filePathWithExt);
      }

      return {
        root: dir,
        ...config,
      };
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
  const config = await importUp<ConfigType>(dir, 'rnef.config');

  if (!config.root) {
    config.root = process.cwd();
  }

  const api = {
    registerCommand: (command: CommandType) => {
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

  const outputConfig: ConfigOutput = {
    commands: config.commands ?? [],
  };

  return outputConfig;
}
