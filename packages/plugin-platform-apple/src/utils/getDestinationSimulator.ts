import child_process from 'child_process';
import findMatchingSimulator from './findMatchingSimulator.js';
import { Device } from '../types/index.js';

export function getDestinationSimulator(
  simulator?: string,
  udid?: string,
  fallbackSimulators: string[] = []
) {
  let simulators: { devices: { [index: string]: Array<Device> } };
  try {
    simulators = JSON.parse(
      child_process.execFileSync(
        'xcrun',
        ['simctl', 'list', '--json', 'devices'],
        { encoding: 'utf8' }
      )
    );
  } catch (error) {
    throw new Error(
      `Could not get the simulator list from Xcode. Please open Xcode and try running project directly from there to resolve the remaining issues. ${error}`
    );
  }

  const selectedSimulator = fallbackSimulators.reduce((simulator, fallback) => {
    return simulator || findMatchingSimulator(simulators, fallback);
  }, findMatchingSimulator(simulators, simulator, udid));

  if (!selectedSimulator) {
    throw new Error(
      `No simulator available with ${
        simulator ? `name "${simulator}"` : `udid "${udid}"`
      }`
    );
  }
  return selectedSimulator;
}
