import { getDestinationSimulator } from '../../utils/getDestinationSimulator.js';

export async function getFallbackSimulator(
  simulator: string | undefined,
  udid: string | undefined
) {
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
  const selectedSimulator = await getDestinationSimulator(
    simulator,
    udid,
    fallbackSimulators
  );

  if (!selectedSimulator) {
    throw new Error(
      `No simulator available with ${
        simulator ? `name "${simulator}"` : `udid "${udid}"`
      }`
    );
  }

  return selectedSimulator;
}
