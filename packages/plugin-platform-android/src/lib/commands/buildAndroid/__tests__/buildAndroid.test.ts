import type { PathLike } from 'node:fs';
import fs from 'node:fs';
import type { AndroidProjectConfig } from '@react-native-community/cli-types';
import * as tools from '@rnef/tools';
import { spawn } from '@rnef/tools';
import color from 'picocolors';
import type { Mock, MockedFunction } from 'vitest';
import { test, vi } from 'vitest';
import { buildAndroid, type BuildFlags } from '../buildAndroid.js';

const actualFs = await vi.importMock('node:fs');

const gradleTaskOutput = `
> Task :tasks

------------------------------------------------------------
Tasks runnable from root project 'com.bananas'
------------------------------------------------------------

Android tasks
-------------
androidDependencies - Displays the Android dependencies of the project.

Build tasks
-----------
assemble - Assemble main outputs for all the variants.
assembleAndroidTest - Assembles all the Test applications.
bundleRelease - Bundles main outputs for all Release variants.`;

const args: BuildFlags = {
  tasks: undefined,
  mode: 'debug',
  activeArchOnly: false,
  extraParams: undefined,
  interactive: undefined,
};
const androidProject: AndroidProjectConfig = {
  appName: 'app',
  packageName: 'com.test',
  applicationId: 'com.test',
  sourceDir: '/android',
  mainActivity: '.MainActivity',
  assets: [],
};

const spinnerMock = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  message: vi.fn(),
}));

vi.spyOn(tools, 'spinner').mockImplementation(() => spinnerMock);

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

function mockCallAdbGetCpu(file: string, args: string[]) {
  return (
    file === '/mock/android/home/platform-tools/adb' &&
    args?.[0] === 'shell' &&
    args?.[1] === 'getprop' &&
    args?.[2] === 'ro.product.cpu.abi'
  );
}

function spawnMockImplementation(file: string, args: string[]) {
  if (mockCallAdbGetCpu(file, args)) {
    return { output: 'arm64-v8a' };
  }
  return { output: '...' };
}

test('buildAndroid runs gradle build with correct configuration for debug and outputs build path', async () => {
  (spawn as Mock).mockImplementation((file, args) =>
    spawnMockImplementation(file, args)
  );
  vi.mocked(fs.existsSync).mockImplementation((file: PathLike) => {
    if (file === '/android/app/build/outputs/bundle/debug/app-debug.aab') {
      return true;
    }
    return (actualFs as typeof fs).existsSync(file);
  });

  await buildAndroid(androidProject, args);

  expect(spawn).toBeCalledWith('./gradlew', ['app:bundleDebug', '-x', 'lint'], {
    stdio: !tools.isInteractive() ? 'inherit' : 'pipe',
    cwd: '/android',
  });
  expect(spinnerMock.stop).toBeCalledWith(
    `Build output: ${color.cyan(
      '/android/app/build/outputs/bundle/debug/app-debug.aab'
    )}`
  );
});

test('buildAndroid fails gracefully when gradle errors', async () => {
  vi.mocked(spawn).mockRejectedValueOnce({ stderr: 'gradle error' });

  await expect(
    buildAndroid(androidProject, args)
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[RnefError: Failed to build the app. See the error above for details from Gradle.]`
  );

  expect(spawn).toBeCalledWith('./gradlew', ['app:bundleDebug', '-x', 'lint'], {
    stdio: !tools.isInteractive() ? 'inherit' : 'pipe',
    cwd: '/android',
  });
});

test('buildAndroid runs selected "bundleRelease" task in interactive mode', async () => {
  (spawn as Mock).mockImplementation((file, args) => {
    if (file === './gradlew' && args[0] === 'tasks') {
      return { output: gradleTaskOutput };
    }
    if (mockCallAdbGetCpu(file, args)) {
      return { output: 'arm64-v8a' };
    }
    return { output: 'output' };
  });
  (
    tools.promptSelect as MockedFunction<typeof tools.promptSelect>
  ).mockResolvedValueOnce(Promise.resolve('bundleRelease'));
  vi.mocked(fs.existsSync).mockImplementation((file: PathLike) => {
    if (file === '/android/app/build/outputs/bundle/release/app-release.aab') {
      return true;
    }
    return (actualFs as typeof fs).existsSync(file);
  });

  await buildAndroid(androidProject, { ...args, interactive: true });

  expect(spawn).toHaveBeenNthCalledWith(
    1,
    './gradlew',
    ['tasks', '--group', 'build'],
    { cwd: '/android' }
  );
  expect(spawn).toHaveBeenNthCalledWith(
    2,
    './gradlew',
    ['app:bundleRelease', '-x', 'lint'],
    { stdio: !tools.isInteractive() ? 'inherit' : 'pipe', cwd: '/android' }
  );
  expect(spinnerMock.start).toBeCalledWith(
    'Searching for available Gradle tasks...'
  );
  expect(spinnerMock.stop).toBeCalledWith('Found 2 Gradle tasks.');
  expect(tools.outro).toBeCalledWith('Success 🎉.');
});
