import path from 'path';
import fs from 'fs';
import os from 'os';
import appDirs from 'appdirsjs';
import logger from './logger.js';
import color from 'picocolors';

type CacheKey = string;
type Cache = { [key in CacheKey]?: string };

function loadCache(name: string): Cache | undefined {
  try {
    const cacheRaw = fs.readFileSync(
      path.resolve(getCacheRootPath(), name),
      'utf8'
    );
    return JSON.parse(cacheRaw);
  } catch (e) {
    if ((e as { code: string }).code === 'ENOENT') {
      // Create cache file since it doesn't exist.
      saveCache(name, {});
    }
    logger.debug('No cache found');
    return undefined;
  }
}

function saveCache(name: string, cache: Cache) {
  const fullPath = path.resolve(getCacheRootPath(), name);

  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, JSON.stringify(cache, null, 2));
}

/**
 * Returns the path string of `$HOME/.rnef`.
 *
 * In case it doesn't exist, it will be created.
 */
function getCacheRootPath() {
  const legacyPath = path.resolve(os.homedir(), '.rnef', 'cache');
  // @ts-expect-error appDirs is not callable according to TS, but types seem fine, ignore it
  const cachePath = appDirs({ appName: 'rnef', legacyPath }).cache;

  if (!fs.existsSync(cachePath)) {
    fs.mkdirSync(cachePath, { recursive: true });
  }

  return cachePath;
}

function removeProjectCache(name: string) {
  const cacheRootPath = getCacheRootPath();
  try {
    const fullPath = path.resolve(cacheRootPath, name);

    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true });
    }
  } catch {
    logger.error(
      `Failed to remove cache for ${name}. If you experience any issues when running freshly initialized project, please remove the "${color.underline(
        path.join(cacheRootPath, name)
      )}" folder manually.`
    );
  }
}

function get(name: string, key: CacheKey): string | undefined {
  const cache = loadCache(name);
  if (cache) {
    return cache[key];
  }
  return undefined;
}

function set(name: string, key: CacheKey, value: string) {
  const cache = loadCache(name);
  if (cache) {
    cache[key] = value;
    saveCache(name, cache);
  }
}

export default {
  get,
  set,
  removeProjectCache,
  getCacheRootPath,
};
