import fs from 'fs';
import path from 'path';
import cacheManager from '../cacheManager.js';
import { vi, describe, beforeEach } from 'vitest';
import { cleanup, getTempDirectory } from '@callstack/rnef-test-helpers';

const DIR = getTempDirectory('.rnef/cache');
const projectName = 'Project1';
const fullPath = path.join(DIR, projectName);

describe('cacheManager', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup(DIR);
  });

  test('should not remove cache if it does not exist', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    vi.spyOn(fs, 'rmSync').mockReturnValue(undefined);

    cacheManager.removeProjectCache(projectName);

    expect(fs.rmSync).not.toHaveBeenCalled();
  });

  test('should remove cache if it exists', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'rmSync').mockReturnValue(undefined);
    vi.spyOn(path, 'resolve').mockReturnValue(fullPath);

    cacheManager.removeProjectCache(projectName);

    expect(fs.rmSync).toHaveBeenCalledWith(fullPath, { recursive: true });
  });
});
