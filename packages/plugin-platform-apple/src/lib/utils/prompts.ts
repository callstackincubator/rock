import { select } from '@clack/prompts';
import { checkCancelPrompt } from '@rnef/tools';
import color from 'picocolors';
import { sortByRecentDevices } from '../commands/run/recentDevices.js';
import type { ApplePlatform, Device } from '../types/index.js';

export async function promptForSchemeSelection(schemes: string[]) {
  return checkCancelPrompt<string>(
    await select({
      message: 'Select the scheme you want to use',
      options: schemes.map((value) => ({
        label: value,
        value: value,
      })),
    })
  );
}

export async function promptForConfigurationSelection(
  configurations: string[]
) {
  return checkCancelPrompt<string>(
    await select({
      message: 'Select the configuration you want to use',
      options: configurations.map((value) => ({
        label: value,
        value: value,
      })),
    })
  );
}

export async function promptForDeviceSelection(
  devices: Device[],
  projectRoot: string,
  platformName: ApplePlatform
) {
  const sortedDevices = sortByRecentDevices(devices, platformName);
  return checkCancelPrompt<Device>(
    await select({
      message: 'Select the device / simulator you want to use',
      options: sortedDevices.map((d) => {
        const markDevice = d.type === 'device' ? ` - (physical device)` : '';
        return {
          label: `${d.name} ${color.dim(`(${d.version})${markDevice}`)}`,
          value: d,
        };
      }),
    })
  );
}
