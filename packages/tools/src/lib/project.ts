import * as fs from 'fs';
import * as path from 'path';

const PROJECT_CONFIG_BASE_NAME = 'rnef.config';
const PROJECT_CONFIG_FILE_EXTENSIONS = ['js', 'ts', 'mjs', 'mts', 'cjs', `cts`];

export function getProjectConfig(dir: string = process.cwd()) {
  for (const ext of PROJECT_CONFIG_FILE_EXTENSIONS) {
    const configPath = path.join(dir, `${PROJECT_CONFIG_BASE_NAME}.${ext}`);
    if (fs.existsSync(configPath)) {
      return configPath;
    }
  }

  const parentDir = path.dirname(dir);
  if (parentDir === dir) {
    throw new Error(`Project config not found`);
  }

  return getProjectConfig(parentDir);
}

export function getProjectRoot(dir?: string) {
  const configPath = getProjectConfig(dir);
  return path.dirname(configPath);
}

/**
 * Returns path to cache root.
 *
 * Cache is stored in: `.rnef/cache` directory in the project root.
 */
export function getCacheRootPath() {
  return path.join(getProjectRoot(), '.rnef/cache');
}
