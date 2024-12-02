import { Device } from '../../types/index.js';
import { getDestinationSimulator } from '../../utils/getDestinationSimulator.js';
import { RunFlags } from './runOptions.js';

export function getFallbackSimulator(args: RunFlags): Device {
  /**
   * If provided simulator does not exist, try simulators in following order
   * - iPhone 14
   * - iPhone 13
   * - iPhone 12
   * - iPhone 11
   */

  const fallbackSimulators = [
    'iPhone 14',
    'iPhone 13',
    'iPhone 12',
    'iPhone 11',
  ];
  const selectedSimulator = getDestinationSimulator(args, fallbackSimulators);

  if (!selectedSimulator) {
    throw new Error(
      `No simulator available with ${
        args.simulator ? `name "${args.simulator}"` : `udid "${args.udid}"`
      }`
    );
  }

  return selectedSimulator;
}
