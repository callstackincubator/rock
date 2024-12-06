import { logger } from '@callstack/rnef-tools';
import color from 'picocolors';
import { Device, DeviceType } from '../../types/index.js';

export function matchingDevice(
  devices: Array<Device>,
  deviceName: string | true | undefined,
  type: DeviceType
) {
  // The condition specifically checks if the value is `true`, not just truthy to allow for `--device` flag without a value
  if (deviceName === true) {
    const firstIOSDevice = devices.find((d) => d.type === 'device');
    if (firstIOSDevice) {
      logger.info(
        `Using first available device named "${color.bold(
          firstIOSDevice.name
        )}" due to lack of name supplied.`
      );
      return firstIOSDevice;
    } else {
      logger.error('No iOS devices connected.');
      return undefined;
    }
  }
  const deviceByName = devices
    .filter((device) => device.type === type)
    .find(
      (device) =>
        device.name === deviceName || formattedDeviceName(device) === deviceName
    );
  const deviceByUdid = devices.find((d) => d.udid === deviceName);

  return deviceByName || deviceByUdid;
}

export function formattedDeviceName(simulator: Device) {
  return simulator.version
    ? `${simulator.name} (${simulator.version})`
    : simulator.name;
}
