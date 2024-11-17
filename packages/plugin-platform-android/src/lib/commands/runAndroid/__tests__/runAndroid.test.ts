import fs, { PathLike } from 'node:fs';
import { vi, test, Mock } from 'vitest';
import { AndroidProjectConfig } from '@react-native-community/cli-types';
import spawn from 'nano-spawn';
import { runAndroid } from '../runAndroid.js';
import { Flags } from '../../runAndroid/runAndroid.js';
import { logger } from '@callstack/rnef-tools';

const actualFs = await vi.importMock('node:fs');

const mocks = vi.hoisted(() => {
  return {
    startMock: vi.fn(),
    stopMock: vi.fn(),
    outroMock: vi.fn(),
  };
});

vi.mock('node:fs');

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
  activeArchOnly: true,
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
let adbDevicesCallsCount = 0;

beforeEach(() => {
  adbDevicesCallsCount = 0;
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

const adbDevicesTwoDevicesOutput = `List of devices attached
emulator-5552	device
emulator-5554	device`;

const emulatorOutput = `INFO    | Storing crashdata in: /tmp/android-thymikee/emu-crash-34.1.20.db, detection is enabled for process: 35762
Pixel_3a_API_32_arm64-v8a
Pixel_8_Pro_API_34`;

function mockCallGradleInstallDebug(file: string, args: string[]) {
  return file === './gradlew' && args?.[0] === 'app:installDebug';
}

function mockCallGradleAssembleDebug(file: string, args: string[]) {
  return file === './gradlew' && args?.[0] === 'app:assembleDebug';
}

function mockCallAdbDevices(file: string, args: string[]) {
  return (
    file === '/mock/android/home/platform-tools/adb' && args?.[0] === 'devices'
  );
}

function mockCallAdbBootCompleted(
  file: string,
  args: string[],
  device: string | undefined
) {
  return (
    file === '/mock/android/home/platform-tools/adb' &&
    args?.[0] === '-s' &&
    args?.[1] === (device ?? 'emulator-5552') &&
    args?.[2] === 'shell' &&
    args?.[3] === 'getprop' &&
    args?.[4] === 'sys.boot_completed'
  );
}

function mockCallAdbReverse(
  file: string,
  args: string[],
  device: string | undefined
) {
  return (
    file === '/mock/android/home/platform-tools/adb' &&
    args?.[0] === '-s' &&
    args?.[1] === (device ?? 'emulator-5552') &&
    args?.[2] === 'reverse'
  );
}

function mockCallAdbGetCpu(
  file: string,
  args: string[],
  device: string | undefined
) {
  return (
    file === '/mock/android/home/platform-tools/adb' &&
    args?.[0] === '-s' &&
    args?.[1] === (device ?? 'emulator-5552') &&
    args?.[2] === 'shell' &&
    args?.[3] === 'getprop' &&
    args?.[4] === 'ro.product.cpu.abi'
  );
}

function mockCallAdbGetAvailableCpus(
  file: string,
  args: string[],
  device: string | undefined
) {
  return (
    file === '/mock/android/home/platform-tools/adb' &&
    args?.[0] === '-s' &&
    args?.[1] === (device ?? 'emulator-5552') &&
    args?.[2] === 'shell' &&
    args?.[3] === 'getprop' &&
    args?.[4] === 'ro.product.cpu.abilist'
  );
}

function mockCallAdbStart(
  file: string,
  args: string[],
  device: string | undefined
) {
  return (
    file === '/mock/android/home/platform-tools/adb' &&
    args?.[0] === '-s' &&
    args?.[1] === (device ?? 'emulator-5552') &&
    args?.[2] === 'shell' &&
    args?.[3] === 'am' &&
    args?.[4] === 'start'
  );
}

function mockCallEmulatorList(file: string, args: string[]) {
  return file === 'emulator' && args?.[0] === '-list-avds';
}

function mockCallEmulatorLaunch(file: string, args: string[]) {
  return file === 'emulator' && args?.[0] === '@Pixel_3a_API_32_arm64-v8a';
}

function spawnMockImplementation(
  file: string,
  args: string[],
  {
    adbDevicesOutput,
    device,
  }: { adbDevicesOutput?: string; device?: string } = {}
) {
  if (mockCallGradleInstallDebug(file, args)) {
    return { output: '<mock-gradle-install>' };
  }
  if (mockCallGradleAssembleDebug(file, args)) {
    return { output: '<mock-gradle-assemble>' };
  }
  if (mockCallAdbDevices(file, args)) {
    adbDevicesCallsCount++;
    if (adbDevicesOutput) {
      return { output: adbDevicesOutput };
    }
    // Simulate devices being connected but not booted yet.
    if (adbDevicesCallsCount >= 3) {
      return { output: adbDevicesOneDeviceOutput };
    }
    return { output: adbDevicesNoDevicesOutput };
  }
  if (mockCallAdbBootCompleted(file, args, device)) {
    return { output: '1' };
  }
  if (mockCallAdbReverse(file, args, device)) {
    return { output: '<mock-adb-reverse>' };
  }
  if (mockCallAdbGetCpu(file, args, device)) {
    return { output: 'arm64-v8a' };
  }
  if (mockCallAdbGetAvailableCpus(file, args, device)) {
    return { output: 'arm64-v8a' };
  }
  if (mockCallAdbStart(file, args, device)) {
    return { output: '<mock-adb-start>' };
  }
  if (mockCallEmulatorList(file, args)) {
    return { output: emulatorOutput };
  }
  if (mockCallEmulatorLaunch(file, args)) {
    return { nodeChildProcess: Promise.resolve({ unref: vi.fn() }) };
  }
  return { output: '...' };
}

test.each([['release'], [undefined], ['staging']])(
  'runAndroid runs gradle build with correct configuration for --mode %s and launches on emulator-5552',
  async (mode) => {
    (spawn as Mock).mockImplementation((file, args) =>
      spawnMockImplementation(file, args)
    );
    const logErrorSpy = vi.spyOn(logger, 'error');
    await runAndroid(androidProject, { ...args, mode: mode }, '/');

    expect(mocks.outroMock).toBeCalledWith('Success.');
    expect(logErrorSpy).not.toBeCalled();

    // Runs installDebug with only active architecture arm64-v8a
    expect(spawn as Mock).toBeCalledWith(
      './gradlew',
      [
        mode === 'release'
          ? 'app:installRelease'
          : mode === 'staging'
          ? 'app:installStaging'
          : 'app:installDebug',
        '-x',
        'lint',
        '-PreactNativeDevServerPort=8081',
        '-PreactNativeArchitectures=arm64-v8a',
      ],
      { stdio: 'inherit', cwd: '/android' }
    );

    // launches com.test app with MainActivity on emulator-5552
    expect(spawn as Mock).toBeCalledWith(
      '/mock/android/home/platform-tools/adb',
      expect.arrayContaining([
        'emulator-5552',
        'com.test/com.test.MainActivity',
      ]),
      { stdio: ['ignore', 'ignore', 'pipe'] }
    );
  }
);

test('runAndroid runs gradle build with custom --appId, --appIdSuffix and --mainActivity', async () => {
  (spawn as Mock).mockImplementation((file, args) =>
    spawnMockImplementation(file, args)
  );
  const logErrorSpy = vi.spyOn(logger, 'error');
  await runAndroid(
    androidProject,
    { ...args, appId: 'com.custom', appIdSuffix: 'suffix', mainActivity: 'OtherActivity' },
    '/'
  );

  expect(mocks.outroMock).toBeCalledWith('Success.');
  expect(logErrorSpy).not.toBeCalled();

  // launches com.custom.suffix app with OtherActivity on emulator-5552
  expect(spawn as Mock).toBeCalledWith(
    '/mock/android/home/platform-tools/adb',
    expect.arrayContaining([
      'emulator-5552',
      'com.custom.suffix/com.test.OtherActivity',
    ]),
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );
});

test('runAndroid fails to launch an app on not-connected device when specified with --device emulator-5554', async () => {
  (spawn as Mock).mockImplementation((file, args) =>
    spawnMockImplementation(file, args)
  );
  const logErrorSpy = vi.spyOn(logger, 'error');
  try {
    await runAndroid(androidProject, { ...args, device: 'emulator-5554' }, '/');
  } catch {
    expect(mocks.outroMock).not.toBeCalledWith('Success.');
    expect(logErrorSpy).toBeCalledWith(
      'Device "emulator-5554" not found. Please run it first or use a different one.'
    );
  }
});

test.each([['release'], [undefined]])(
  `runAndroid launches an app on a selected device emulator-5554 when connected in --mode %s`,
  async (mode) => {
    (spawn as Mock).mockImplementation((file, args) => {
      if (mockCallAdbBootCompleted(file, args, 'emulator-5554')) {
        return { output: '1' };
      }
      if (mockCallAdbReverse(file, args, 'emulator-5554')) {
        return { output: '<mock-adb-reverse>' };
      }
      if (mockCallAdbGetCpu(file, args, 'emulator-5554')) {
        return { output: 'armeabi-v7a' };
      }
      if (mockCallAdbGetAvailableCpus(file, args, 'emulator-5554')) {
        return { output: 'arm64-v8a,armeabi-v7a' };
      }
      if (mockCallAdbStart(file, args, 'emulator-5554')) {
        return { output: '<mock-adb-start>' };
      }
      return spawnMockImplementation(file, args, {
        adbDevicesOutput: adbDevicesTwoDevicesOutput,
      });
    });

    vi.mocked(fs.existsSync).mockImplementation((file: PathLike) => {
      if (file === '/android/app/build/outputs/apk/debug/app-debug.apk') {
        return true;
      }
      if (file === '/android/app/build/outputs/apk/release/app-release.apk') {
        return true;
      }
      return (actualFs as typeof fs).existsSync(file);
    });

    await runAndroid(
      androidProject,
      { ...args, device: 'emulator-5554', mode: mode },
      '/'
    );

    // we don't want to run installDebug when a device is selected, because gradle will install the app on all connected devices
    expect(spawn as Mock).not.toBeCalledWith(
      './gradlew',
      expect.arrayContaining(['app:installDebug'])
    );

    // Runs assemble debug task with active architectures arm64-v8a, armeabi-v7a
    expect(spawn as Mock).toBeCalledWith(
      './gradlew',
      [
        mode === 'release' ? 'app:assembleRelease' : 'app:assembleDebug',
        '-x',
        'lint',
        '-PreactNativeDevServerPort=8081',
        '-PreactNativeArchitectures=arm64-v8a,armeabi-v7a',
      ],
      { stdio: 'inherit', cwd: '/android' }
    );

    // launches com.test app with MainActivity on emulator-5554
    expect(spawn as Mock).toBeCalledWith(
      '/mock/android/home/platform-tools/adb',
      expect.arrayContaining([
        'emulator-5554',
        'com.test/com.test.MainActivity',
      ]),
      { stdio: ['ignore', 'ignore', 'pipe'] }
    );
  }
);

test('runAndroid launches an app on all connected devices', async () => {
  (spawn as Mock).mockImplementation((file, args) => {
    if (mockCallAdbBootCompleted(file, args, 'emulator-5554')) {
      return { output: '1' };
    }
    if (mockCallAdbReverse(file, args, 'emulator-5554')) {
      return { output: '<mock-adb-reverse>' };
    }
    if (mockCallAdbGetCpu(file, args, 'emulator-5554')) {
      return { output: 'armeabi-v7a' };
    }
    if (mockCallAdbGetAvailableCpus(file, args, 'emulator-5554')) {
      return { output: 'arm64-v8a,armeabi-v7a' };
    }
    if (mockCallAdbStart(file, args, 'emulator-5554')) {
      return { output: '<mock-adb-start>' };
    }
    return spawnMockImplementation(file, args, {
      adbDevicesOutput: adbDevicesTwoDevicesOutput,
    });
  });

  await runAndroid(androidProject, { ...args }, '/');

  // Runs assemble debug task with active architectures arm64-v8a, armeabi-v7a
  expect(spawn as Mock).toBeCalledWith(
    './gradlew',
    [
      'app:installDebug',
      '-x',
      'lint',
      '-PreactNativeDevServerPort=8081',
      '-PreactNativeArchitectures=arm64-v8a,armeabi-v7a',
    ],
    { stdio: 'inherit', cwd: '/android' }
  );

  // launches com.test app with MainActivity on emulator-5552
  expect(spawn as Mock).toBeCalledWith(
    '/mock/android/home/platform-tools/adb',
    expect.arrayContaining(['emulator-5552', 'com.test/com.test.MainActivity']),
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );

  // launches com.test app with MainActivity on emulator-5554
  expect(spawn as Mock).toBeCalledWith(
    '/mock/android/home/platform-tools/adb',
    expect.arrayContaining(['emulator-5554', 'com.test/com.test.MainActivity']),
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );
});

test('runAndroid skips building when --binary-path is passed', async () => {
  (spawn as Mock).mockImplementation((file, args) => {
    if (mockCallAdbBootCompleted(file, args, 'emulator-5554')) {
      return { output: '1' };
    }
    if (mockCallAdbReverse(file, args, 'emulator-5554')) {
      return { output: '<mock-adb-reverse>' };
    }
    if (mockCallAdbGetCpu(file, args, 'emulator-5554')) {
      return { output: 'armeabi-v7a' };
    }
    if (mockCallAdbGetAvailableCpus(file, args, 'emulator-5554')) {
      return { output: 'arm64-v8a,armeabi-v7a' };
    }
    if (mockCallAdbStart(file, args, 'emulator-5554')) {
      return { output: '<mock-adb-start>' };
    }
    return spawnMockImplementation(file, args, {
      adbDevicesOutput: adbDevicesTwoDevicesOutput,
    });
  });

  vi.mocked(fs.existsSync).mockImplementation((file: PathLike) => {
    // binaryPath is normalized to root + binaryPath
    if (file === '/root/android/app/build/outputs/apk/debug/app-debug.apk') {
      return true;
    }
    return (actualFs as typeof fs).existsSync(file);
  });

  await runAndroid(
    androidProject,
    {
      ...args,
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
    },
    '/root'
  );

  // Skips gradle
  expect(spawn as Mock).not.toBeCalledWith('./gradlew');

  // launches com.test app with MainActivity on emulator-5554
  expect(spawn as Mock).toBeCalledWith(
    '/mock/android/home/platform-tools/adb',
    expect.arrayContaining(['emulator-5552', 'com.test/com.test.MainActivity']),
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );

  // launches com.test app with MainActivity on emulator-5554
  expect(spawn as Mock).toBeCalledWith(
    '/mock/android/home/platform-tools/adb',
    expect.arrayContaining(['emulator-5554', 'com.test/com.test.MainActivity']),
    { stdio: ['ignore', 'ignore', 'pipe'] }
  );
});
