import type { PathLike } from 'node:fs';
import fs from 'node:fs';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getInstallOutputFileName } from '../findOutputFile.js';

function mockExistingFiles(buildDirectory: string, buildFileName: string) {
  const existingFilesPaths = [
    `${buildDirectory}/${buildFileName}`,
    buildDirectory,
  ];

  vi.mocked(fs.existsSync).mockImplementation((file: PathLike) =>
    existingFilesPaths.includes(file.toString()),
  );
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('getInstallOutputFileName', () => {
  const variant = 'debug';
  const apkOrAab = 'apk';

  test('returns CPU-specific file', async () => {
    const appName = 'app';
    const buildDirectory = 'android/app/build/outputs/apk/debug';
    const buildFileNameOutput = 'app-universal-debug.apk';
    mockExistingFiles(buildDirectory, buildFileNameOutput);

    const result = await getInstallOutputFileName(
      appName,
      variant,
      buildDirectory,
      apkOrAab,
      undefined,
    );

    expect(result).toBe(buildFileNameOutput);
  });

  test('returns build file if appName is provided', async () => {
    const appName = 'app';
    const buildDirectory = 'android/app/build/outputs/apk/debug';
    const buildFileNameOutput = 'app-debug.apk';
    mockExistingFiles(buildDirectory, buildFileNameOutput);

    const result = await getInstallOutputFileName(
      appName,
      variant,
      buildDirectory,
      apkOrAab,
      undefined,
    );

    expect(result).toBe(buildFileNameOutput);
  });

  test('returns build file if appName is missing', async () => {
    const appName = '';
    const buildDirectory = 'Android/build/outputs/apk/debug';
    const buildFileNameOutput = 'HybridApp-debug.apk';
    mockExistingFiles(buildDirectory, buildFileNameOutput);
    vi.mocked(fs.readdirSync).mockReturnValueOnce([buildFileNameOutput as any]);

    const result = await getInstallOutputFileName(
      appName,
      variant,
      buildDirectory,
      apkOrAab,
      undefined,
    );

    expect(result).toBe(buildFileNameOutput);
  });
});
