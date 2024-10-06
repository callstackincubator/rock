import * as fs from 'node:fs';
import * as path from 'node:path';

export type PluginOutput = {
  name: string;
  description: string;
};

export type PluginApi = {
  registerCommand: (command: CommandType) => void;
};

type PluginType = (args: PluginApi) => PluginOutput;

type CommandType = {
  name: string;
  description: string;
  action: (args: unknown) => void;
  options?: Array<{ name: string; description: string }>;
};

type ConfigType = {
  plugins?: Record<string, PluginType>;
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
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require(require.resolve(filePathWithExt));
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

  const api = {
    registerCommand: (command: CommandType) => {
      config.commands = [...(config.commands || []), command];
    },
  };

  if (config.plugins) {
    // plugins register commands
    for (const plugin in config.plugins) {
      config.plugins[plugin](api);
    }
  }

  const outputConfig: ConfigOutput = {
    commands: config.commands ?? [],
  };

  return outputConfig;
}
