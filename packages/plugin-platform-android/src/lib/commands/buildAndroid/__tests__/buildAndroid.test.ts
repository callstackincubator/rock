import { vi, test, Mock, MockedFunction } from 'vitest';
import {
  AndroidProjectConfig,
  Config,
} from '@react-native-community/cli-types';
import spawn from 'nano-spawn';
import { select } from '@clack/prompts';
import { buildAndroid } from '../buildAndroid.js';
import { Flags } from '../../runAndroid/runAndroid.js';

vi.mock('nano-spawn', () => {
  return {
    default: vi.fn(),
  };
});

const startMock = vi.fn();
const stopMock = vi.fn();

vi.mock('@clack/prompts', () => {
  return {
    spinner: vi.fn(() => ({
      start: startMock,
      stop: stopMock,
      message: vi.fn(),
    })),
    select: vi.fn(),
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
const config = {
  project: { android: androidProject },
} as unknown as Config;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

test('buildAndroid runs gradle build with correct configuration for debug', async () => {
  (spawn as Mock).mockResolvedValueOnce({ stdout: 'output' });
  await buildAndroid(config, args);

  expect(spawn as Mock).toBeCalledWith(
    './gradlew',
    ['app:bundleDebug', '-x', 'lint', '-PreactNativeDevServerPort=8081'],
    { stdio: ['ignore', 'ignore', 'inherit'], cwd: '/android' }
  );
  expect(startMock).toBeCalledWith('Building the app with Gradle');
  expect(stopMock).toBeCalledWith('Build successful.');
});

test('buildAndroid fails gracefully when gradle errors', async () => {
  (spawn as Mock).mockRejectedValueOnce({ stderr: 'gradle error' });

  try {
    await buildAndroid(config, args);
  } catch (e) {
    expect(e).toMatchObject(Error('process.exit unexpectedly called with "1"'));
  }

  expect(spawn as Mock).toBeCalledWith(
    './gradlew',
    ['app:bundleDebug', '-x', 'lint', '-PreactNativeDevServerPort=8081'],
    { stdio: ['ignore', 'ignore', 'inherit'], cwd: '/android' }
  );
  expect(startMock).toBeCalledWith('Building the app with Gradle');
  expect(stopMock).toBeCalledWith(
    'Failed to build the app. See the error above for details from Gradle.',
    1
  );
});

test('buildAndroid runs selected "bundleRelease" task in interactive mode', async () => {
  (spawn as Mock).mockImplementation((...args) => {
    if (args[0] === './gradlew' && args[1][0] === 'tasks') {
      return { stdout: gradleTaskOutput };
    }
    return { stdout: 'output' };
  });
  (select as MockedFunction<typeof select>).mockResolvedValueOnce(
    Promise.resolve('bundleRelease')
  );

  await buildAndroid(config, { ...args, interactive: true });

  expect(spawn as Mock).toHaveBeenNthCalledWith(
    1,
    './gradlew',
    ['tasks', '--group', 'build'],
    { cwd: '/android' }
  );
  expect(spawn as Mock).toHaveBeenNthCalledWith(
    2,
    './gradlew',
    ['app:bundleRelease', '-x', 'lint', '-PreactNativeDevServerPort=8081'],
    { stdio: ['ignore', 'ignore', 'inherit'], cwd: '/android' }
  );
  expect(startMock).toBeCalledWith('Building the app with Gradle');
  expect(stopMock).toHaveBeenNthCalledWith(1, 'Found 2 Gradle tasks.');
  expect(stopMock).toHaveBeenNthCalledWith(2, 'Build successful.');
});
