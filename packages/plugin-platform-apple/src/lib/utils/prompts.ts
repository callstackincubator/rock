import { select } from '@clack/prompts';
import { Device } from '../types/index.js';
import { checkCancelPrompt } from '@callstack/rnef-tools';

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

export async function promptForDeviceSelection(devices: Device[]) {
  return checkCancelPrompt<Device>(
    await select({
      message: 'Select the device / emulator you want to use',
      options: devices
        .filter(({ type }) => type === 'device' || type === 'simulator')
        .map((d) => {
          const availability =
            !d.isAvailable && !!d.availabilityError
              ? `(unavailable - ${d.availabilityError})`
              : '';

          return {
            label: `${d.name}${getVersionFromDevice(d)} ${availability}`,
            value: d,
            disabled: !d.isAvailable,
          };
        }),
    })
  );
}

function getVersionFromDevice({ version }: Device) {
  return version ? ` (${version.match(/^(\d+\.\d+)/)?.[1]})` : '';
}
