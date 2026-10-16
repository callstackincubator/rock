import fs from 'node:fs';
import path from 'node:path';
import { cleanup, getTempDirectory } from '@rock-js/test-helpers';
import type * as fsFingerprint from 'fs-fingerprint';
import { calculateFingerprint } from 'fs-fingerprint';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { nativeFingerprint } from '../fingerprint/index.js';

const PROJECT_ROOT = getTempDirectory('fingerprint_project');
const DEPENDENCY_ROOT = path.join(PROJECT_ROOT, 'node_modules', 'native-lib');

vi.mock('fs-fingerprint', async (importOriginal) => {
  const actual = await importOriginal<typeof fsFingerprint>();
  return {
    ...actual,
    calculateFingerprint: vi.fn(actual.calculateFingerprint),
  };
});

vi.mock('../../index.js', () => ({
  getReactNativeVersion: vi.fn(() => '0.80.0'),
  logger: { debug: vi.fn() },
}));

vi.mock('../fingerprint/ignorePaths.js', () => ({
  getAllIgnorePaths: vi.fn(() => []),
}));

vi.mock('../spawn.js', () => ({
  spawn: vi.fn(async () => ({
    stdout: JSON.stringify({
      root: PROJECT_ROOT,
      project: { android: { sourceDir: path.join(PROJECT_ROOT, 'android') } },
      dependencies: {
        'native-lib': {
          root: DEPENDENCY_ROOT,
          name: 'native-lib',
          platforms: {
            android: { sourceDir: path.join(DEPENDENCY_ROOT, 'android') },
          },
        },
      },
    }),
  })),
}));

function writeDependencyVersion(version: string) {
  fs.writeFileSync(
    path.join(DEPENDENCY_ROOT, 'package.json'),
    JSON.stringify({ name: 'native-lib', version }),
  );
}

function fingerprint() {
  return nativeFingerprint(PROJECT_ROOT, {
    platform: 'android',
    extraSources: [],
    ignorePaths: [],
    env: [],
  });
}

describe('nativeFingerprint', () => {
  beforeEach(() => {
    fs.mkdirSync(path.join(PROJECT_ROOT, 'android'), { recursive: true });
    fs.mkdirSync(DEPENDENCY_ROOT, { recursive: true });
    fs.writeFileSync(
      path.join(PROJECT_ROOT, 'package.json'),
      JSON.stringify({ name: 'app', scripts: {} }),
    );
    fs.writeFileSync(
      path.join(PROJECT_ROOT, 'android', 'build.gradle'),
      'apply plugin: "com.android.application"',
    );
    writeDependencyVersion('1.0.0');
  });

  afterEach(() => {
    cleanup(PROJECT_ROOT);
  });

  test('changes when an autolinked dependency is upgraded', async () => {
    const before = await fingerprint();
    const unchanged = await fingerprint();
    expect(unchanged.hash).toBe(before.hash);

    writeDependencyVersion('2.0.0');
    const after = await fingerprint();

    expect(after.hash).not.toBe(before.hash);
  });

  test('hashes autolinked dependencies with relative paths and versions', async () => {
    await fingerprint();

    const [, options] = vi.mocked(calculateFingerprint).mock.lastCall ?? [];
    const autolinking = options?.extraInputs?.find(
      (input) => input.key === 'autolinkingSources',
    );

    expect(autolinking?.json).toEqual({
      'native-lib': {
        root: 'node_modules/native-lib',
        name: 'native-lib',
        version: '1.0.0',
        platforms: {
          android: { sourceDir: 'node_modules/native-lib/android' },
        },
      },
    });
  });
});
