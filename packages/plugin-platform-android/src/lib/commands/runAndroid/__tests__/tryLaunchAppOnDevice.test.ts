import type { AndroidProjectConfig } from '@react-native-community/cli-types';
import spawn from 'nano-spawn';
import { test, vi } from 'vitest';
import type { DeviceData } from '../listAndroidDevices.js';
import type { Flags } from '../runAndroid.js';
import { tryLaunchAppOnDevice } from '../tryLaunchAppOnDevice.js';

vi.mock('nano-spawn', () => {
  return {
    default: vi.fn(() => Promise.resolve({ stdout: '', stderr: '' })),
  };
});

const OLD_ENV = process.env;

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  process.env = { ...OLD_ENV, ANDROID_HOME: '/mock/android/home' };
});

afterAll(() => {
  process.env = OLD_ENV;
});

const device: DeviceData = {
  deviceId: 'emulator-5554',
  readableName: 'Emulator 5554',
  connected: true,
  type: 'emulator',
};

const args: Flags = {
  activeArchOnly: false,
  port: '8081',
  appId: '',
  appIdSuffix: '',
  mode: 'debug',
  remoteCache: false,
};

const androidProject: AndroidProjectConfig = {
  sourceDir: '/Users/thymikee/Developer/tmp/App73/android',
  appName: 'app',
  packageName: 'com.myapp',
  applicationId: 'com.myapp.custom',
  mainActivity: '.MainActivity',
  dependencyConfiguration: undefined,
  watchModeCommandParams: undefined,
  assets: [],
};

const shellStartCommand = ['-s', 'emulator-5554', 'shell', 'am', 'start'];
const actionCategoryFlags = [
  '-a',
  'android.intent.action.MAIN',
  '-c',
  'android.intent.category.LAUNCHER',
];

test('launches adb shell with intent to launch com.myapp.MainActivity with different appId than packageName on a simulator', async () => {
  await tryLaunchAppOnDevice(device, androidProject, args);

  expect(spawn).toHaveBeenCalledWith(
    '/mock/android/home/platform-tools/adb',
    [
      ...shellStartCommand,
      '-n',
      'com.myapp.custom/com.myapp.MainActivity',
      ...actionCategoryFlags,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );
});

test('launches adb shell with intent to launch com.myapp.MainActivity with different appId than packageName on a simulator when mainActivity is fully qualified name', async () => {
  await tryLaunchAppOnDevice(
    device,
    { ...androidProject, mainActivity: 'com.myapp.MainActivity' },
    args
  );

  expect(spawn).toHaveBeenCalledWith(
    '/mock/android/home/platform-tools/adb',
    [
      ...shellStartCommand,
      '-n',
      'com.myapp.custom/com.myapp.MainActivity',
      ...actionCategoryFlags,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );
});

test('launches adb shell with intent to launch com.myapp.MainActivity with same appId as packageName on a simulator', async () => {
  await tryLaunchAppOnDevice(
    device,
    { ...androidProject, applicationId: 'com.myapp' },
    args
  );

  expect(spawn).toHaveBeenCalledWith(
    '/mock/android/home/platform-tools/adb',
    [
      ...shellStartCommand,
      '-n',
      'com.myapp/com.myapp.MainActivity',
      ...actionCategoryFlags,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );
});

test('launches adb shell with intent to launch com.myapp.MainActivity with different appId than packageName on a device', async () => {
  await tryLaunchAppOnDevice(device, androidProject, args);

  expect(spawn).toHaveBeenCalledWith(
    '/mock/android/home/platform-tools/adb',
    [
      ...shellStartCommand,
      '-n',
      'com.myapp.custom/com.myapp.MainActivity',
      ...actionCategoryFlags,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );
});

test('launches adb shell with intent to launch fully specified activity with different appId than packageName and an app suffix on a device', async () => {
  await tryLaunchAppOnDevice(
    device,
    {
      ...androidProject,
      mainActivity: 'com.zoontek.rnbootsplash.RNBootSplashActivity',
    },
    {
      ...args,
      appIdSuffix: 'dev',
    }
  );

  expect(spawn).toHaveBeenCalledWith(
    '/mock/android/home/platform-tools/adb',
    [
      ...shellStartCommand,
      '-n',
      'com.myapp.custom.dev/com.zoontek.rnbootsplash.RNBootSplashActivity',
      ...actionCategoryFlags,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );
});

test('--appId flag overwrites applicationId setting in androidProject', async () => {
  await tryLaunchAppOnDevice(device, androidProject, {
    ...args,
    appId: 'my.app.id',
  });

  expect(spawn).toHaveBeenCalledWith(
    '/mock/android/home/platform-tools/adb',
    [
      ...shellStartCommand,
      '-n',
      'my.app.id/com.myapp.MainActivity',
      ...actionCategoryFlags,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );
});

test('appIdSuffix Staging is appended to applicationId', async () => {
  await tryLaunchAppOnDevice(device, androidProject, {
    ...args,
    appIdSuffix: 'Staging',
  });

  expect(spawn).toHaveBeenCalledWith(
    '/mock/android/home/platform-tools/adb',
    [
      ...shellStartCommand,
      '-n',
      'com.myapp.custom.Staging/com.myapp.MainActivity',
      ...actionCategoryFlags,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );
});
