import { supportedPlatforms } from './../supportedPlatforms.js';

type ObjectValues<T> = T[keyof T];

export type ApplePlatform = ObjectValues<typeof supportedPlatforms>;

export interface Device {
  name: string;
  udid: string;
  state?: string;
  availability?: string;
  isAvailable?: boolean;
  version?: string;
  sdk?: string;
  availabilityError?: string;
  type?: DeviceType;
  lastBootedAt?: string;
}

export type DeviceType = 'simulator' | 'device' | 'catalyst';

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
