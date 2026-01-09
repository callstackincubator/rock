import fs from 'node:fs';
import path from 'node:path';
import { colorLink } from './color.js';
import { RockError } from './error.js';
import logger from './logger.js';
import { getCacheRootPath } from './project.js';

const CACHE_FILE_NAME = 'project.json';

type CacheKey = string;
type Cache = { [key in CacheKey]?: string };
type CacheAccessOptions = { cacheRootPathOverride?: string };

export function getCacheFile(cacheRootPathOverride?: string) {
  return path.join(
    cacheRootPathOverride ?? getCacheRootPath(),
    CACHE_FILE_NAME,
  );
}

function loadCache({ cacheRootPathOverride }: CacheAccessOptions = {}): Cache {
  try {
    const cachePath = path.resolve(getCacheFile(cacheRootPathOverride));
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

function saveCache(
  cache: Cache,
  { cacheRootPathOverride }: CacheAccessOptions = {},
) {
  const cachePath = path.resolve(getCacheFile(cacheRootPathOverride));
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
}

function removeProjectCache(cacheRootPathOverride?: string) {
  try {
    const cachePath = path.resolve(getCacheFile(cacheRootPathOverride));
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

function get(
  key: CacheKey,
  { cacheRootPathOverride }: CacheAccessOptions = {},
): string | undefined {
  const cache = loadCache({ cacheRootPathOverride });
  return cache[key];
}

function set(
  key: CacheKey,
  value: string,
  { cacheRootPathOverride }: CacheAccessOptions = {},
) {
  const cache = loadCache({ cacheRootPathOverride });
  cache[key] = value;
  saveCache(cache, { cacheRootPathOverride });
}

function remove(
  key: CacheKey,
  { cacheRootPathOverride }: CacheAccessOptions = {},
) {
  const cache = loadCache({ cacheRootPathOverride });
  delete cache[key];
  saveCache(cache, { cacheRootPathOverride });
}

export default {
  get,
  set,
  remove,
  removeProjectCache,
  getCacheRootPath,
};
