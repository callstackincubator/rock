import { ApplePlatform } from '../types/index.js';

interface PlatformInfo {
  readableName: string;
}

/**
 * Returns platform readable name.
 * Falls back to iOS if platform is not supported.
 */
export function getPlatformInfo(platform: ApplePlatform): PlatformInfo {
  switch (platform) {
    case 'tvos':
      return {
        readableName: 'tvOS',
      };
    case 'visionos':
      return {
        readableName: 'visionOS',
      };
    case 'macos':
      return {
        readableName: 'macOS',
      };
    case 'ios':
    default:
      return {
        readableName: 'iOS',
      };
  }
}
