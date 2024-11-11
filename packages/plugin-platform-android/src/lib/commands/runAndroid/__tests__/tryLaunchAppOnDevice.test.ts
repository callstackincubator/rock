import { AndroidProjectConfig } from '@react-native-community/cli-types';
import tryLaunchAppOnDevice from '../tryLaunchAppOnDevice.js';
import { Flags } from '../index.js';
import spawn from 'nano-spawn';
import { vi, test } from 'vitest';

vi.mock('nano-spawn', () => {
  return {
    default: vi.fn(() => Promise.resolve({ stdout: '', stderr: '' })),
  };
});

vi.mock('@clack/prompts', () => {
  return {
    spinner: vi.fn(() => ({ start: vi.fn(), message: vi.fn(), stop: vi.fn() })),
    select: vi.fn(),
  };
});

const device = 'emulator-5554';
const args: Flags = {
  activeArchOnly: false,
  packager: true,
  port: '8081',
  terminal: 'iTerm.app',
  appId: '',
  appIdSuffix: '',
};

const androidProject: AndroidProjectConfig = {
  sourceDir: '/Users/thymikee/Developer/tmp/App73/android',
  appName: 'app',
  packageName: 'com.myapp',
  applicationId: 'com.myapp.custom',
  mainActivity: '.MainActivity',
  dependencyConfiguration: undefined,
  watchModeCommandParams: undefined,
  unstable_reactLegacyComponentNames: undefined,
  assets: [],
};

const shellStartCommand = ['-s', 'emulator-5554', 'shell', 'am', 'start'];
const actionCategoryFlags = [
  '-a',
  'android.intent.action.MAIN',
  '-c',
  'android.intent.category.LAUNCHER',
];

beforeEach(() => {
  vi.clearAllMocks();
});

test('launches adb shell with intent to launch com.myapp.MainActivity with different appId than packageName on a simulator', async () => {
  await tryLaunchAppOnDevice(device, androidProject, args);

  expect(spawn).toHaveBeenCalledWith(
    'adb',
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
    'adb',
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
    'adb',
    [
      ...shellStartCommand,
      '-n',
      'com.myapp/com.myapp.MainActivity',
      ...actionCategoryFlags,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );
});

test('launches adb shell with intent to launch com.myapp.MainActivity with different appId than packageName on a device (without calling simulator)', async () => {
  await tryLaunchAppOnDevice(device, androidProject, args);

  expect(spawn).toHaveBeenCalledWith(
    'adb',
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
    'adb',
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
    'adb',
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
    'adb',
    [
      ...shellStartCommand,
      '-n',
      'com.myapp.custom.Staging/com.myapp.MainActivity',
      ...actionCategoryFlags,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );
});
