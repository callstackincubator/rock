import * as fs from 'node:fs';
import * as path from 'node:path';

type PluginType = () => {
  name: string;
  commands: CommandType;
};

type CommandType = Array<{
  name: string;
  description: string;
  action: () => void;
}>;

type ConfigType = {
  plugins?: Record<string, PluginType>;
  commands?: CommandType;
};

type ConfigOutput = {
  commands?: CommandType;
};

const extensions = ['.js', '.ts', '.mjs'];

const importUp = async <T>(dir: string, name: string): Promise<T> => {
  const filePath = path.join(dir, name);

  for (const ext of extensions) {
    const filePathWithExt = `${filePath}${ext}`;
    if (fs.existsSync(filePathWithExt)) {
      return import(require.resolve(filePathWithExt));
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

  if (config.plugins) {
    for (const plugin in config.plugins) {
      const pluginOutput = config.plugins[plugin]();
      config.commands = [
        ...(config.commands || []),
        ...(pluginOutput.commands || []),
      ];
    }

    delete config.plugins;
  }

  const outputConfig: ConfigOutput = {
    commands: config.commands ?? [],
  };

  return outputConfig;
}
