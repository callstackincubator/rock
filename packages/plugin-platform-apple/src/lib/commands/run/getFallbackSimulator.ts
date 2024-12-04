import spawn from 'nano-spawn';
import { Device } from '../../types/index.js';

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

async function getDestinationSimulator(
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

/**
 * Takes in a parsed simulator list and a desired name, and returns an object with the matching simulator. The desired
 * name can optionally include the iOS version in between parenthesis after the device name. Ex: "iPhone 6 (9.2)" in
 * which case it'll attempt to find a simulator with the exact version specified.
 *
 * If the simulatorString argument is null, we'll go into default mode and return the currently booted simulator,
 * the last booted simulator or
 * if none is booted, it will be the first in the list.
 *
 * @param simulators a parsed list from `xcrun simctl list --json devices` command
 * @param findOptions null or an object containing:
 * ```
 * {
 *    simulator: name of desired simulator
 *    udid: udid of desired simulator
 * }
 * ```
 * If null, it will use the currently booted simulator, or if none are booted, the first in the list.
 */
function findMatchingSimulator(
  simulators: { devices: { [index: string]: Array<Device> } },
  simulator?: string,
  udid?: string
) {
  if (!simulators.devices) {
    return null;
  }
  const devices = simulators.devices;
  let simulatorVersion;
  let simulatorName = null;

  if (simulator) {
    const parsedSimulatorName = simulator.match(/(.*)? (?:\((\d+\.\d+)?\))$/);
    if (parsedSimulatorName && parsedSimulatorName[2] !== undefined) {
      simulatorVersion = parsedSimulatorName[2];
      simulatorName = parsedSimulatorName[1];
    } else {
      simulatorName = simulator;
    }
  }

  let match;
  let fallbackMatch;

  const sortedDevices = Object.fromEntries(
    Object.entries(devices).sort(
      (a, b) => Number(b[0].includes('iOS')) - Number(a[0].includes('iOS'))
    )
  );

  for (const versionDescriptor in sortedDevices) {
    const device = sortedDevices[versionDescriptor];
    let version = versionDescriptor;

    if (/^com\.apple\.CoreSimulator\.SimRuntime\./g.test(version)) {
      // Transform "com.apple.CoreSimulator.SimRuntime.iOS-12-2" into "iOS 12.2"
      version = version.replace(
        /^com\.apple\.CoreSimulator\.SimRuntime\.([^-]+)-([^-]+)-([^-]+)$/g,
        '$1 $2.$3'
      );
    }

    // Making sure the version of the simulator is an iOS or tvOS (Removes Apple Watch, etc)
    if (!version.includes('iOS') && !version.includes('tvOS')) {
      continue;
    }
    if (simulatorVersion && !version.endsWith(simulatorVersion)) {
      continue;
    }
    for (const i in device) {
      const simulator = device[i];
      // Skipping non-available simulator
      if (
        simulator.availability !== '(available)' &&
        // @ts-expect-error todo fix
        simulator.isAvailable !== 'YES' &&
        simulator.isAvailable !== true
      ) {
        continue;
      }
      const lastBootedAt = simulator.lastBootedAt;
      const simulatorDescriptor: Device = {
        udid: simulator.udid,
        name: simulator.name,
        state: simulator.state,
        version,
        type: 'simulator',
      };
      if (udid) {
        if (simulator.udid === udid) {
          return simulatorDescriptor;
        }
      } else {
        if (simulator.state === 'Booted' && simulatorName === null) {
          return simulatorDescriptor;
        }
        if (simulator.name === simulatorName && !match) {
          match = simulatorDescriptor;
        }
        // If no match found, use first available simulator that was booted before
        if (!!lastBootedAt && !match) {
          fallbackMatch = simulatorDescriptor;
        }
        // Keeps track of the first available simulator for use if we can't find one above.
        if (simulatorName === null && !match) {
          match = simulatorDescriptor;
        }
      }
    }
  }

  return match ?? fallbackMatch ?? null;
}
