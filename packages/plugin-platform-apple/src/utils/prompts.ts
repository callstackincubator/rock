import { select } from '@clack/prompts';
import { Device } from '../types/index.js';

export async function promptForSchemeSelection(
  schemes: string[]
): Promise<string> {
  const scheme = await select({
    message: 'Select the scheme you want to use',
    options: schemes.map((value) => ({
      label: value,
      value: value,
    })),
  });

  return scheme as string;
}

export async function promptForConfigurationSelection(
  configurations: string[]
): Promise<string> {
  const configuration = await select({
    message: 'Select the configuration you want to use',
    options: configurations.map((value) => ({
      label: value,
      value: value,
    })),
  });

  return configuration as string;
}

export async function promptForDeviceSelection(
  devices: Device[]
): Promise<Device | undefined> {
  const device = await select({
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
  });

  return device as Device;
}

function getVersionFromDevice({ version }: Device) {
  return version ? ` (${version.match(/^(\d+\.\d+)/)?.[1]})` : '';
}
