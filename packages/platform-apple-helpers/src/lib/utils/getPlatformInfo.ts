import type { ApplePlatform } from '../types/index.js';

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

export type PlatformSDK =
  | 'iphonesimulator'
  | 'macosx'
  | 'appletvsimulator'
  | 'xrsimulator'
  | 'iphoneos'
  | 'appletvos'
  | 'xr';

export function getSimulatorPlatformSDK(platform: ApplePlatform): PlatformSDK {
  switch (platform) {
    case 'ios':
      return 'iphonesimulator';
    case 'macos':
      return 'macosx';
    case 'tvos':
      return 'appletvsimulator';
    case 'visionos':
      return 'xrsimulator';
  }
}

export function getDevicePlatformSDK(platform: ApplePlatform): PlatformSDK {
  switch (platform) {
    case 'ios':
      return 'iphoneos';
    case 'macos':
      return 'macosx';
    case 'tvos':
      return 'appletvos';
    case 'visionos':
      return 'xr';
  }
}
