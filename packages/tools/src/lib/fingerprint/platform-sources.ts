import type {
  FingerprintPlatform,
  FingerprintPlatformSource,
} from './types.js';
import { sourceDir } from './utils.js';

const platformMap = {
  ios: getIosPlatformSource,
  android: getAndroidPlatformSources,
};

export function getPlatformSources(
  platform: FingerprintPlatform
): FingerprintPlatformSource {
  return platformMap[platform]() ?? [];
}

export function getIosPlatformSource(): FingerprintPlatformSource {
  return {
    platform: 'ios',
    sources: [sourceDir('ios', 'platform-ios')],
    dirExcludes: ['ios/DerivedData', 'ios/Pods'],
  };
}

export function getAndroidPlatformSources(): FingerprintPlatformSource {
  return {
    platform: 'android',
    sources: [sourceDir('android', 'platform-android')],
    dirExcludes: [
      'android/build',
      'android/**/build',
      'android/**/.cxx',
      'android/local.properties',
      'android/.idea',
      'android/.gradle',
    ],
  };
}
