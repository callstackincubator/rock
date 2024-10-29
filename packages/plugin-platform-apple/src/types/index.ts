import { supportedPlatforms } from './../config/supportedPlatforms.js';

type ObjectValues<T> = T[keyof T];

export type ApplePlatform = ObjectValues<typeof supportedPlatforms>;

export interface Device {
  // TODO: here check which command are we using and use the fixed logic for downloading the simulators and devices
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
