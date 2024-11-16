import { vi, test, Mock } from 'vitest';
import { AndroidProjectConfig } from '@react-native-community/cli-types';
import spawn from 'nano-spawn';
import { runAndroid } from '../runAndroid.js';
import { Flags } from '../../runAndroid/runAndroid.js';

const mocks = vi.hoisted(() => {
  return {
    startMock: vi.fn(),
    stopMock: vi.fn(),
    outroMock: vi.fn(),
  };
});

vi.mock('nano-spawn', () => {
  return {
    default: vi.fn(),
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

const OLD_ENV = process.env;

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  process.env = { ...OLD_ENV, ANDROID_HOME: '/mock/android/home' };
});

afterAll(() => {
  process.env = OLD_ENV;
});

const adbDevicesNoDevicesOutput = `List of devices attached`;

const adbDevicesOneDeviceOutput = `List of devices attached
emulator-5552	device`;

const emulatorOutput = `INFO    | Storing crashdata in: /tmp/android-thymikee/emu-crash-34.1.20.db, detection is enabled for process: 35762
Pixel_3a_API_32_arm64-v8a
Pixel_8_Pro_API_34`;

test('runAndroid runs gradle build with correct configuration for debug and launches on emulator-5552', async () => {
  let adbDevicesCallsCount = 0;
  (spawn as Mock).mockImplementation((...args) => {
    if (args[0] === './gradlew' && args[1][0] === 'app:installDebug') {
      return { output: '...' };
    }
    if (
      args[0] === '/mock/android/home/platform-tools/adb' &&
      args[1][0] === 'devices'
    ) {
      adbDevicesCallsCount++;
      if (adbDevicesCallsCount >= 4) {
        return { output: adbDevicesOneDeviceOutput };
      }
      return { output: adbDevicesNoDevicesOutput };
    }
    if (
      args[0] === '/mock/android/home/platform-tools/adb' &&
      args[1][0] === '-s' &&
      args[1][1] === 'emulator-5552' &&
      args[1][2] === 'shell' &&
      args[1][3] === 'getprop' &&
      args[1][4] === 'sys.boot_completed'
    ) {
      return { output: '1' };
    }
    if (
      args[0] === '/mock/android/home/platform-tools/adb' &&
      args[1][0] === '-s' &&
      args[1][1] === 'emulator-5552' &&
      args[1][2] === 'reverse'
    ) {
      return { output: '...' };
    }
    if (
      args[0] === '/mock/android/home/platform-tools/adb' &&
      args[1][0] === '-s' &&
      args[1][1] === 'emulator-5552' &&
      args[1][2] === 'shell' &&
      args[1][3] === 'getprop' &&
      args[1][4] === 'ro.product.cpu.abi'
    ) {
      return { output: 'arm64-v8a' };
    }
    if (
      args[0] === '/mock/android/home/platform-tools/adb' &&
      args[1][0] === '-s' &&
      args[1][1] === 'emulator-5552' &&
      args[1][2] === 'shell' &&
      args[1][3] === 'am' &&
      args[1][4] === 'start'
    ) {
      return { output: '...' };
    }
    if (args[0] === 'emulator' && args[1][0] === '-list-avds') {
      return { output: emulatorOutput };
    }
    if (args[0] === 'emulator' && args[1][0] === '@Pixel_3a_API_32_arm64-v8a') {
      return { nodeChildProcess: Promise.resolve({ unref: vi.fn() }) };
    }
    return { output: '...' };
  });
  await runAndroid(androidProject, args, '/');

  expect(mocks.outroMock).toBeCalledWith('Success.');

  expect(spawn as Mock).toBeCalledWith(
    './gradlew',
    [
      'app:installDebug',
      '-x',
      'lint',
      '-PreactNativeDevServerPort=8081',
      '-PreactNativeArchitectures=arm64-v8a',
    ],
    { stdio: 'inherit', cwd: '/android' }
  );
  expect(spawn as Mock).toBeCalledWith(
    '/mock/android/home/platform-tools/adb',
    [
      '-s',
      'emulator-5552',
      'shell',
      'am',
      'start',
      '-n',
      'com.test/com.test.MainActivity',
      '-a',
      'android.intent.action.MAIN',
      '-c',
      'android.intent.category.LAUNCHER',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );
});
