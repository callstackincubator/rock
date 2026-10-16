import { existsSync } from 'node:fs';
import path from 'node:path';
import { logger, spawn } from '@rock-js/tools';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Device } from '../../../types/index.js';
import { launchSimulator } from '../runOnSimulator.js';

const developerDir = '/Applications/Xcode.app/Contents/Developer';
const simulatorApp = path.join(developerDir, 'Applications', 'Simulator.app');
const deviceHubApp = path.join(
  developerDir,
  '..',
  'Applications',
  'DeviceHub.app',
);

const shutdownSimulator: Device = {
  name: 'iPhone 17',
  udid: 'AAAA-BBBB-CCCC',
  version: 'iOS 27.0',
  platform: 'ios',
  type: 'simulator',
  state: 'Shutdown',
};

const bootedSimulator: Device = { ...shutdownSimulator, state: 'Booted' };

const mockExisting = (...existing: string[]) => {
  vi.mocked(existsSync).mockImplementation((target) =>
    existing.includes(String(target)),
  );
};

const openCalls = () =>
  (spawn as Mock).mock.calls.filter(([file]) => file === 'open');

beforeEach(() => {
  vi.clearAllMocks();
  (spawn as Mock).mockImplementation((file: string) => {
    if (file === 'xcode-select') {
      // xcode-select prints a trailing newline; the code must trim it
      return Promise.resolve({ output: `${developerDir}\n` });
    }
    return Promise.resolve({ output: '' });
  });
});

describe('launchSimulator', () => {
  it('opens Simulator.app with -CurrentDeviceUDID and boots a Shutdown device', async () => {
    mockExisting(simulatorApp, deviceHubApp);

    await launchSimulator(shutdownSimulator);

    expect(spawn).toHaveBeenCalledWith('xcode-select', ['-p'], {
      stdio: 'pipe',
    });
    expect(spawn).toHaveBeenCalledWith('open', [
      simulatorApp,
      '--args',
      '-CurrentDeviceUDID',
      shutdownSimulator.udid,
    ]);
    expect(spawn).toHaveBeenCalledWith('xcrun', [
      'simctl',
      'boot',
      shutdownSimulator.udid,
    ]);
    expect(openCalls()).toHaveLength(1);
  });

  it('opens Simulator.app without -CurrentDeviceUDID and does not boot a Booted device', async () => {
    mockExisting(simulatorApp, deviceHubApp);

    await launchSimulator(bootedSimulator);

    expect(spawn).toHaveBeenCalledWith('open', [simulatorApp]);
    expect(spawn).not.toHaveBeenCalledWith(
      'open',
      expect.arrayContaining(['-CurrentDeviceUDID']),
    );
    expect(spawn).not.toHaveBeenCalledWith(
      'xcrun',
      expect.arrayContaining(['boot']),
    );
    expect(openCalls()).toHaveLength(1);
  });

  it('falls back to Device Hub via the devices:// URL scheme when Simulator.app is absent', async () => {
    mockExisting(deviceHubApp);

    await launchSimulator(shutdownSimulator);

    expect(spawn).toHaveBeenCalledWith('open', [
      `devices://device/open?id=${shutdownSimulator.udid}`,
    ]);
    expect(spawn).not.toHaveBeenCalledWith(
      'open',
      expect.arrayContaining(['-CurrentDeviceUDID']),
    );
    expect(spawn).not.toHaveBeenCalledWith('open', [deviceHubApp]);
    expect(spawn).toHaveBeenCalledWith('xcrun', [
      'simctl',
      'boot',
      shutdownSimulator.udid,
    ]);
    expect(openCalls()).toHaveLength(1);
  });

  it('opens DeviceHub.app directly when the devices:// deep link fails', async () => {
    mockExisting(deviceHubApp);
    (spawn as Mock).mockImplementation((file: string, args: string[]) => {
      if (file === 'xcode-select') {
        return Promise.resolve({ output: `${developerDir}\n` });
      }
      if (file === 'open' && args[0]?.startsWith('devices://')) {
        return Promise.reject({
          stderr: 'Unable to open devices://device/open?id=AAAA-BBBB-CCCC',
        });
      }
      return Promise.resolve({ output: '' });
    });

    await launchSimulator(bootedSimulator);

    expect(spawn).toHaveBeenCalledWith('open', [
      `devices://device/open?id=${bootedSimulator.udid}`,
    ]);
    expect(spawn).toHaveBeenCalledWith('open', [deviceHubApp]);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Failed to open Device Hub via URL scheme'),
    );
    expect(openCalls()).toHaveLength(2);
  });

  it('warns and still boots the device when neither Simulator.app nor DeviceHub.app exists', async () => {
    mockExisting();

    await expect(launchSimulator(shutdownSimulator)).resolves.toBeUndefined();

    expect(openCalls()).toHaveLength(0);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        `Neither Simulator.app nor DeviceHub.app was found under ${developerDir}`,
      ),
    );
    expect(spawn).toHaveBeenCalledWith('xcrun', [
      'simctl',
      'boot',
      shutdownSimulator.udid,
    ]);
  });

  it('does nothing for a physical device', async () => {
    mockExisting(simulatorApp, deviceHubApp);

    await launchSimulator({ ...shutdownSimulator, type: 'device' });

    expect(spawn).not.toHaveBeenCalled();
    expect(existsSync).not.toHaveBeenCalled();
  });
});
