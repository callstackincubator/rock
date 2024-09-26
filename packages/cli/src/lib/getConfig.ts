import * as fs from 'node:fs';
import * as path from 'node:path';

type ConfigType = {
  projectConfig?: object;
  plugins?: object;
  commands: Array<{
    name: string;
    description: string;
    action: (config: ConfigType) => void;
  }>;
};

const extensions = ['.js', '.ts', '.mjs'];

const findUp = async <T>(dir: string, name: string): Promise<T> => {
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

  return findUp(parentDir, name);
};

export async function getConfig(
  dir: string = process.cwd()
): Promise<ConfigType | null> {
  return findUp<ConfigType>(dir, 'rnef.config');
}
