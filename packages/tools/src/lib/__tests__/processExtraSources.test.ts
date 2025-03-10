import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { processExtraSources } from '../fingerprint/processExtraSources.js';

describe('processExtraSources', () => {
  const mockProjectRoot = '/mock/project/root';

  beforeEach(() => {
    vi.spyOn(fs, 'existsSync').mockImplementation(() => true);
    vi.spyOn(fs, 'statSync').mockImplementation(
      () =>
        ({
          isDirectory: () => false,
        } as any)
    );
    vi.spyOn(fs, 'readFileSync').mockImplementation(() => 'mock content');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should process a single file', async () => {
    const result = await processExtraSources(['file.txt'], mockProjectRoot);

    expect(result).toEqual([
      {
        type: 'contents',
        id: path.join(mockProjectRoot, 'file.txt'),
        contents: 'mock content',
        reasons: ['custom-user-config'],
      },
    ]);
  });

  it('should process a directory', async () => {
    vi.spyOn(fs, 'statSync').mockImplementation(
      () =>
        ({
          isDirectory: () => true,
        } as any)
    );

    const result = await processExtraSources(['dir'], mockProjectRoot);

    expect(result).toEqual([
      {
        type: 'dir',
        filePath: path.join(mockProjectRoot, 'dir'),
        reasons: ['custom-user-config'],
      },
    ]);
  });

  it('should handle non-existent paths', async () => {
    vi.spyOn(fs, 'existsSync').mockImplementation(() => false);

    const result = await processExtraSources(
      ['non-existent.txt'],
      mockProjectRoot
    );

    expect(result).toEqual([]);
  });

  it('should process multiple sources of different types', async () => {
    const statSyncMock = vi.spyOn(fs, 'statSync');
    statSyncMock
      .mockImplementationOnce(() => ({ isDirectory: () => false } as any))
      .mockImplementationOnce(() => ({ isDirectory: () => true } as any));

    const result = await processExtraSources(
      ['file.txt', 'dir'],
      mockProjectRoot
    );

    expect(result).toEqual([
      {
        type: 'contents',
        id: path.join(mockProjectRoot, 'file.txt'),
        contents: 'mock content',
        reasons: ['custom-user-config'],
      },
      {
        type: 'dir',
        filePath: path.join(mockProjectRoot, 'dir'),
        reasons: ['custom-user-config'],
      },
    ]);
  });

  it('should handle absolute paths', async () => {
    const absolutePath = '/absolute/path/file.txt';

    const result = await processExtraSources([absolutePath], mockProjectRoot);

    expect(result).toEqual([
      {
        type: 'contents',
        id: absolutePath,
        contents: 'mock content',
        reasons: ['custom-user-config'],
      },
    ]);
  });

  it('should handle errors when reading files', async () => {
    vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('Failed to read file');
    });

    const result = await processExtraSources(['file.txt'], mockProjectRoot);

    expect(result).toEqual([]);
  });
});
