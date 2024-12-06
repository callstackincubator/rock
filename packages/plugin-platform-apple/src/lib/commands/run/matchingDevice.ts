import { logger } from '@callstack/rnef-tools';
import color from 'picocolors';
import { ApplePlatform, Device, DeviceType } from '../../types/index.js';
import { getPlatformInfo } from '../../utils/getPlatformInfo.js';

export function matchingDevice(
  devices: Array<Device>,
  deviceName: string | true | undefined,
  platform: ApplePlatform,
  type: DeviceType
) {
  // The condition specifically checks if the value is `true`, not just truthy to allow for `--device` flag without a value
  if (deviceName === true) {
    const firstBootedDevice = devices.find(
      (d) => d.type === type && d.state === 'Booted'
    );
    if (firstBootedDevice) {
      return firstBootedDevice;
    }
    const firstDevice = devices.find((d) => d.type === type);
    if (firstDevice) {
      logger.info(
        `Using first available device named "${color.bold(
          firstDevice.name
        )}" due to lack of name supplied.`
      );
      return firstDevice;
    } else {
      logger.error(
        `No ${getPlatformInfo(platform).readableName} devices connected.`
      );
      return undefined;
    }
  }
  const devicesByType = devices.filter((d) => d.type === type);
  const deviceByName = devicesByType.find(
    (device) =>
      device.name === deviceName || formattedDeviceName(device) === deviceName
  );
  const deviceByUdid = devicesByType.find((d) => d.udid === deviceName);

  return deviceByName || deviceByUdid;
}

export function formattedDeviceName(simulator: Device) {
  return simulator.version
    ? `${simulator.name} (${simulator.version})`
    : simulator.name;
}
