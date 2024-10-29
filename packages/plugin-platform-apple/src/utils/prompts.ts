import chalk from 'chalk';
import { Device } from '../types/index.js';
// import { prompt } from '@react-native-community/cli-tools';
import { multiselect, select } from '@clack/prompts';

function getVersionFromDevice({ version }: Device) {
  return version ? ` (${version.match(/^(\d+\.\d+)/)?.[1]})` : '';
}

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
  const device = await multiselect({
    message: 'Select the device you want to use',
    options: devices
      .filter(({ type }) => type === 'device' || type === 'simulator')
      .map((d) => {
        const availability =
          !d.isAvailable && !!d.availabilityError
            ? chalk.red(`(unavailable - ${d.availabilityError})`)
            : '';

        return {
          label: `${chalk.bold(
            `${d.name}${getVersionFromDevice(d)}`
          )} ${availability}`,
          value: d,
          disabled: !d.isAvailable, // TODO: check if it's working after migration to new prompts lib
        };
      }),
    required: true,
  });

  console.log(device);

  // @ts-expect-error: FIXME
  return device;
}

export async function promptForDeviceToTailLogs(
  platformReadableName: string,
  simulators: Device[]
): Promise<string> {
  const udid = await select({
    message: `Select ${platformReadableName} simulators to tail logs from`,
    options: simulators.map((simulator) => ({
      label: `${simulator.name}${getVersionFromDevice(simulator)}`.trim(),
      value: simulator.udid,
    })),
  });

  return udid as string;
}
