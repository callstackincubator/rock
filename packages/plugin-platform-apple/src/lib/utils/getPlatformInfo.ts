import { ApplePlatform } from '../types/index.js';

interface PlatformInfo {
  readableName: string;
  sdkNames: string[];
}

/**
 * Returns platform readable name and list of SDKs for given platform.
 * We can get list of SDKs from `xcodebuild -showsdks` command.
 *
 * Falls back to iOS if platform is not supported.
 */
export function getPlatformInfo(platform: ApplePlatform): PlatformInfo {
  switch (platform) {
    case 'tvos':
      return {
        readableName: 'tvOS',
        sdkNames: ['appletvsimulator', 'appletvos'],
      };
    case 'visionos':
      return {
        readableName: 'visionOS',
        sdkNames: ['xrsimulator', 'xros'],
      };
    case 'macos':
      return {
        readableName: 'macOS',
        sdkNames: ['macosx'],
      };
    case 'ios':
    default:
      return {
        readableName: 'iOS',
        sdkNames: ['iphonesimulator', 'iphoneos'],
      };
  }
}
