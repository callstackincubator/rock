import path from 'node:path';
import fs from 'node:fs';
import appDirs from 'appdirsjs';
import logger from './logger.js';
import color from 'picocolors';
import { RnefError } from './error.js';

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
 * Returns path to cache.
 * Cache is stored in:
 * home/user/.cache/rnef on Linux
 * /Users/User/Library/Caches/rnef on MacOS
 * C:\Users\User\AppData\Local\Temp\rnef on Windows
 */
function getCacheRootPath() {
  const { cache } = appDirs.default({ appName: 'rnef' });
  if (!fs.existsSync(cache)) {
    fs.mkdirSync(cache, { recursive: true });
  }
  return cache;
}

function removeProjectCache(name: string) {
  const cacheRootPath = getCacheRootPath();
  try {
    const fullPath = path.resolve(cacheRootPath, name);

    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true });
    }
  } catch (error) {
    throw new RnefError(
      `Failed to remove cache for ${name}. If you experience any issues when running freshly initialized project, please remove the "${color.underline(
        path.join(cacheRootPath, name)
      )}" folder manually.`,
      { cause: error }
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
