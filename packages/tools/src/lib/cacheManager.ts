import path from 'node:path';
import fs from 'node:fs';
import color from 'picocolors';
import { RnefError } from './error.js';
import logger from './logger.js';
import { getCacheRootPath } from './project.js';

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
  const cachePath = path.resolve(getCacheRootPath(), name);
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
}

function removeProjectCache(name: string) {
  const cacheRootPath = getCacheRootPath();
  try {
    const cachePath = path.resolve(cacheRootPath, name);
    if (fs.existsSync(cachePath)) {
      fs.rmSync(cachePath, { recursive: true });
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
  getCacheRootPath: getCacheRootPath,
};
