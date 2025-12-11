import type { ApplePlatform, DeviceType } from '../types/index.js';

export type DestinationInfo = {
  device: string;
  simulator: string;
};

export const genericDestinations = {
  ios: {
    device: 'generic/platform=iOS',
    simulator: 'generic/platform=iOS Simulator',
  },
  macos: {
    device: 'generic/platform=macOS',
    simulator: 'generic/platform=macOS',
  },
  visionos: {
    device: 'generic/platform=visionOS',
    simulator: 'generic/platform=visionOS Simulator',
  },
  tvos: {
    device: 'generic/platform=tvOS',
    simulator: 'generic/platform=tvOS Simulator',
  },
} as const satisfies Record<ApplePlatform, DestinationInfo>;

export function getGenericDestination(
  platform: ApplePlatform,
  deviceType: DeviceType,
): string {
  return genericDestinations[platform][deviceType];
}
