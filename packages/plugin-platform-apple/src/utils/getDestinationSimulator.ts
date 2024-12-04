import findMatchingSimulator from './findMatchingSimulator.js';
import { Device } from '../types/index.js';
import spawn from 'nano-spawn';

export async function getDestinationSimulator(
  simulator?: string,
  udid?: string,
  fallbackSimulators: string[] = []
) {
  let simulators: { devices: { [index: string]: Array<Device> } };
  try {
    const { output } = await spawn('xcrun', [
      'simctl',
      'list',
      '--json',
      'devices',
    ]);
    simulators = JSON.parse(output);
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
