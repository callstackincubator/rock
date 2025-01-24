import fs from 'node:fs';
import path from 'node:path';
import { cleanup, getTempDirectory } from '@rnef/test-helpers';
import { beforeEach, describe, vi } from 'vitest';
import cacheManager, { getCacheFile } from '../cacheManager.js';

const CACHE_ROOT = getTempDirectory('cache_root');

vi.mock('../project.js', () => ({
  getCacheRootPath: vi.fn(() => CACHE_ROOT),
}));

describe('cacheManager', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup(CACHE_ROOT);
  });

  test('set should persist value in cache file', () => {
    cacheManager.set('key', 'value');
    const cacheFile = getCacheFile();
    expect(fs.existsSync(cacheFile)).toBe(true);
    expect(JSON.parse(fs.readFileSync(cacheFile, 'utf8'))).toEqual({
      key: 'value',
    });
  });

  test('get should read value from cache file', () => {
    const cacheFile = getCacheFile();
    fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify({ key: 'value' }, null, 2));

    expect(cacheManager.get('key')).toBe('value');
  });

  test('remove should purge value from cache file', () => {
    const cacheFile = getCacheFile();
    fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify({ key: 'value' }, null, 2));

    expect(cacheManager.remove('key')).toBeUndefined();
    expect(JSON.parse(fs.readFileSync(cacheFile, 'utf8'))).toEqual({});
  });

  test('should not remove cache if it does not exist', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    vi.spyOn(fs, 'rmSync').mockReturnValue(undefined);

    cacheManager.removeProjectCache();
    expect(fs.rmSync).not.toHaveBeenCalled();
  });

  test('should remove cache if it exists', () => {
    cacheManager.set('key', 'value');
    const cacheFile = getCacheFile();
    expect(fs.existsSync(cacheFile)).toBe(true);

    cacheManager.removeProjectCache();
    expect(fs.existsSync(cacheFile)).toBe(false);
  });
});
