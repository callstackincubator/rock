import { promptSelect } from '@rnef/tools';
import color from 'picocolors';
import { sortByRecentDevices } from '../commands/run/recentDevices.js';
import type { ApplePlatform, Device } from '../types/index.js';

export function promptForSchemeSelection(schemes: string[], preselectedScheme?: string) {
  return preselectedScheme
    ? Promise.resolve(preselectedScheme)
    : promptSelect({
        message: 'Select the scheme you want to use',
        options: schemes.map((value) => ({
          label: value,
          value: value,
        })),
      });
}

export function promptForConfigurationSelection(configurations: string[], preselectedConfiguration?: string) {
  return preselectedConfiguration
    ? Promise.resolve(preselectedConfiguration)
    : promptSelect({
        message: 'Select the configuration you want to use',
        options: configurations.map((value) => ({
          label: value,
          value: value,
        })),
      });
}

export function promptForDeviceSelection(
  devices: Device[],
  platformName: ApplePlatform
) {
  const sortedDevices = sortByRecentDevices(devices, platformName);
  return promptSelect({
    message: 'Select the device / simulator you want to use',
    options: sortedDevices.map((d) => {
      const markDevice = d.type === 'device' ? ` - (physical device)` : '';
      return {
        label: `${d.name} ${color.dim(`(${d.version})${markDevice}`)}`,
        value: d,
      };
    }),
  });
}
