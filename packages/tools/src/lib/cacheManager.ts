import fs from 'node:fs';
import path from 'node:path';
import { colorLink } from './color.js';
import { RockError } from './error.js';
import logger from './logger.js';
import { getCacheRootPath } from './project.js';

const CACHE_FILE_NAME = 'project.json';

type CacheKey = string;
type Cache = { [key in CacheKey]?: string };

export function getCacheFile() {
  return path.join(getCacheRootPath(), CACHE_FILE_NAME);
}

function loadCache(): Cache {
  try {
    const cachePath = path.resolve(getCacheFile());
    if (!fs.existsSync(cachePath)) {
      logger.debug(`No cache found at: ${cachePath}`);
      return {};
    }

    const content = fs.readFileSync(cachePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    logger.warn('Failed to load cache', error);
    return {};
  }
}

function saveCache(cache: Cache) {
  const cachePath = path.resolve(getCacheFile());
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
}

function removeProjectCache() {
  try {
    const cachePath = path.resolve(getCacheFile());
    if (fs.existsSync(cachePath)) {
      fs.rmSync(cachePath, { recursive: true });
    }
  } catch (error) {
    throw new RockError(
      `Failed to remove cache for ${name}. If you experience any issues when running freshly initialized project, please remove the "${colorLink(
        path.join(getCacheFile()),
      )}" folder manually.`,
      { cause: error },
    );
  }
}

function get(key: CacheKey): string | undefined {
  const cache = loadCache();
  return cache[key];
}

function set(key: CacheKey, value: string) {
  const cache = loadCache();
  cache[key] = value;
  saveCache(cache);
}

function remove(key: CacheKey) {
  const cache = loadCache();
  delete cache[key];
  saveCache(cache);
}

export default {
  get,
  set,
  remove,
  removeProjectCache,
  getCacheRootPath,
};
