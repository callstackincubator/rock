import { ApplePlatform } from '../../types/index.js';

export const simulatorDestinationMap: Record<ApplePlatform, string> = {
  ios: 'iOS Simulator',
  macos: 'macOS',
  visionos: 'visionOS Simulator',
  tvos: 'tvOS Simulator',
};
