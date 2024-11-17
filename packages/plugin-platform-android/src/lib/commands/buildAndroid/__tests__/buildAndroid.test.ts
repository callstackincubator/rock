import { vi, test, Mock, MockedFunction } from 'vitest';
import { AndroidProjectConfig } from '@react-native-community/cli-types';
import { logger } from '@callstack/rnef-tools';
import spawn from 'nano-spawn';
import { select } from '@clack/prompts';
import { buildAndroid } from '../buildAndroid.js';
import { Flags } from '../../runAndroid/runAndroid.js';

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

const args: Flags = {
  appId: '',
  tasks: undefined,
  mode: 'debug',
  appIdSuffix: '',
  mainActivity: 'MainActivity',
  port: '8081',
  activeArchOnly: false,
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

test('buildAndroid runs gradle build with correct configuration for debug', async () => {
  (spawn as Mock).mockResolvedValueOnce({ output: 'output' });
  await buildAndroid(androidProject, args);

  expect(vi.mocked(spawn)).toBeCalledWith(
    './gradlew',
    ['app:bundleDebug', '-x', 'lint', '-PreactNativeDevServerPort=8081'],
    { stdio: 'inherit', cwd: '/android' }
  );
});

test('buildAndroid fails gracefully when gradle errors', async () => {
  vi.mocked(spawn).mockRejectedValueOnce({ stderr: 'gradle error' });
  vi.spyOn(logger, 'error');

  try {
    await buildAndroid(androidProject, args);
  } catch {
    expect(logger.error).toBeCalledWith(
      'Failed to build the app. See the error above for details from Gradle.'
    );
  }

  expect(vi.mocked(spawn)).toBeCalledWith(
    './gradlew',
    ['app:bundleDebug', '-x', 'lint', '-PreactNativeDevServerPort=8081'],
    { stdio: 'inherit', cwd: '/android' }
  );
});

test('buildAndroid runs selected "bundleRelease" task in interactive mode', async () => {
  (spawn as Mock).mockImplementation((file, args) => {
    if (file === './gradlew' && args[0] === 'tasks') {
      return { output: gradleTaskOutput };
    }
    return { output: 'output' };
  });
  (select as MockedFunction<typeof select>).mockResolvedValueOnce(
    Promise.resolve('bundleRelease')
  );

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
    ['app:bundleRelease', '-x', 'lint', '-PreactNativeDevServerPort=8081'],
    { stdio: 'inherit', cwd: '/android' }
  );
  expect(mocks.startMock).toBeCalledWith(
    'Searching for available Gradle tasks...'
  );
  expect(mocks.stopMock).toBeCalledWith('Found 2 Gradle tasks.');
  expect(mocks.outroMock).toBeCalledWith('Success.');
});
