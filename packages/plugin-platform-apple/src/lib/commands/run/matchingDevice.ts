import { Device } from '../../types/index.js';

export function matchingDevice(
  devices: Array<Device>,
  deviceName: string | undefined
) {
  const deviceByName = devices.find(
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
