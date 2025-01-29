import type { supportedPlatforms } from '../utils/supportedPlatforms.js';

type ObjectValues<T> = T[keyof T];

export type ApplePlatform = ObjectValues<typeof supportedPlatforms>;

export interface Device {
  name: string;
  udid: string;
  version: string; // e.g. visionOS 2.0
  platform: ApplePlatform | undefined;
  type: DeviceType;
  state: 'Booted' | 'Shutdown';
}

export type DeviceType = 'simulator' | 'device';

export interface Info {
  name: string;
  schemes?: string[];
  configurations?: string[];
  targets?: string[];
}

export interface BuilderCommand {
  platformName: ApplePlatform;
}

export interface XcodeProjectInfo {
  name: string;
  path: string;
  isWorkspace: boolean;
}

export interface Params {
  sourceDir?: string;
  assets?: string[]; // TODO: should we support it?
}

export interface ProjectConfig {
  sourceDir: string;
  xcodeProject: XcodeProjectInfo | null;
  // assets: string[]; TODO: what's our approach for assets?
}
