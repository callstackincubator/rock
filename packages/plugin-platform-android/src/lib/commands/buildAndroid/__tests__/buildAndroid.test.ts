import fs, { PathLike } from 'node:fs';
import { vi, test, Mock, MockedFunction } from 'vitest';
import { AndroidProjectConfig } from '@react-native-community/cli-types';
import { logger } from '@rnef/tools';
import spawn from 'nano-spawn';
import { select } from '@clack/prompts';
import { buildAndroid, type BuildFlags } from '../buildAndroid.js';
import color from 'picocolors';

const actualFs = await vi.importMock('node:fs');

vi.mock('node:fs');
vi.mock('nano-spawn', () => {
  return {
    default: vi.fn(),
  };
});

const mocks = vi.hoisted(() => {
  return {
    startMock: vi.fn(),
    stopMock: vi.fn(),
    outroMock: vi.fn(),
  };
});

vi.mock('@clack/prompts', () => {
  return {
    spinner: vi.fn(() => ({
      start: mocks.startMock,
      stop: mocks.stopMock,
      message: vi.fn(),
    })),
    select: vi.fn(),
    isCancel: vi.fn(() => false),
    intro: vi.fn(),
    outro: mocks.outroMock,
  };
});

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

  expect(vi.mocked(spawn)).toBeCalledWith(
    './gradlew',
    ['app:bundleDebug', '-x', 'lint'],
    { stdio: 'inherit', cwd: '/android' }
  );
  expect(mocks.stopMock).toBeCalledWith(
    `Build output: ${color.cyan(
      '/android/app/build/outputs/bundle/debug/app-debug.aab'
    )}`
  );
});

test('buildAndroid fails gracefully when gradle errors', async () => {
  vi.mocked(spawn).mockRejectedValueOnce({ stderr: 'gradle error' });
  vi.spyOn(logger, 'error');

  await expect(
    buildAndroid(androidProject, args)
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[RnefError: Failed to build the app. See the error above for details from Gradle.]`
  );

  expect(vi.mocked(spawn)).toBeCalledWith(
    './gradlew',
    ['app:bundleDebug', '-x', 'lint'],
    { stdio: 'inherit', cwd: '/android' }
  );
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
  (select as MockedFunction<typeof select>).mockResolvedValueOnce(
    Promise.resolve('bundleRelease')
  );
  vi.mocked(fs.existsSync).mockImplementation((file: PathLike) => {
    if (file === '/android/app/build/outputs/bundle/release/app-release.aab') {
      return true;
    }
    return (actualFs as typeof fs).existsSync(file);
  });

  await buildAndroid(androidProject, { ...args, interactive: true });

  expect(vi.mocked(spawn)).toHaveBeenNthCalledWith(
    1,
    './gradlew',
    ['tasks', '--group', 'build'],
    { cwd: '/android' }
  );
  expect(vi.mocked(spawn)).toHaveBeenNthCalledWith(
    2,
    './gradlew',
    ['app:bundleRelease', '-x', 'lint'],
    { stdio: 'inherit', cwd: '/android' }
  );
  expect(mocks.startMock).toBeCalledWith(
    'Searching for available Gradle tasks...'
  );
  expect(mocks.stopMock).toBeCalledWith('Found 2 Gradle tasks.');
  expect(mocks.outroMock).toBeCalledWith('Success 🎉.');
});
