import type { Device } from '../../types/index.js';

export function matchingDevice(devices: Array<Device>, deviceArg: string) {
  const deviceByName = devices.find(
    (device) =>
      device.name === deviceArg ||
      formattedDeviceName(device, true) === deviceArg ||
      formattedDeviceName(device, false) === deviceArg
  );
  const deviceByUdid = devices.find((d) => d.udid === deviceArg);
  return deviceByName || deviceByUdid;
}

export function formattedDeviceName(simulator: Device, replaceIOS: boolean) {
  const bareVersion = simulator.version?.replace(/^iOS /, '');
  return simulator.version
    ? `${simulator.name} (${replaceIOS ? bareVersion : simulator.version})`
    : simulator.name;
}
