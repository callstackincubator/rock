import type { ApplePlatform } from '../types/index.js';

export type DestinationType = 'device' | 'simulator';

export type DestinationInfo = {
  device: string;
  simulator: string;
};

export const genericDestinations: Record<ApplePlatform, DestinationInfo> = {
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
} as const;

export function getGenericDestination(
  platform: ApplePlatform,
  type: DestinationType
) {
  return genericDestinations[platform][type];
}
