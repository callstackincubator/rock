import { Device } from '../../types/index.js';

export function matchingDevice(devices: Array<Device>, deviceArg: string) {
  const deviceByName = devices.find(
    (device) =>
      device.name === deviceArg || formattedDeviceName(device) === deviceArg
  );
  const deviceByUdid = devices.find((d) => d.udid === deviceArg);
  return deviceByName || deviceByUdid;
}

export function formattedDeviceName(simulator: Device) {
  return simulator.version
    ? `${simulator.name} (${simulator.version})`
    : simulator.name;
}
