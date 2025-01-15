import { parse } from 'shell-quote';
import type { BuilderCommand } from '../../types/index.js';
import { getPlatformInfo } from '../../utils/getPlatformInfo.js';

export type BuildFlags = {
  verbose?: boolean;
  interactive?: boolean;
  mode: string;
  scheme: string;
  target?: string;
  extraParams?: string[];
  exportExtraParams?: string[];
  device?: string;
  catalyst?: boolean;
  buildFolder?: string;
  destination?: string;
  archive?: boolean;
};

export const getBuildOptions = ({ platformName }: BuilderCommand) => {
  const { readableName } = getPlatformInfo(platformName);

  return [
    {
      name: '--verbose',
      description: '',
    },
    {
      name: '-i --interactive',
      description:
        'Explicitly select which scheme and configuration to use before running a build',
    },
    {
      name: '--mode <string>',
      description:
        'Explicitly set the scheme configuration to use. This option is case sensitive.',
    },
    {
      name: '--scheme <string>',
      description: 'Explicitly set Xcode scheme to use',
    },
    {
      name: '--target <string>',
      description: 'Explicitly set Xcode target to use.',
    },
    {
      name: '--extra-params <string>',
      description: 'Custom params that will be passed to xcodebuild command.',
      parse: (val: string) => parse(val),
    },
    {
      name: '--export-extra-params <string>',
      description:
        'Custom params that will be passed to xcodebuild export archive command.\n' +
        'Example:\n' +
        '  --export-extra-params "-allowProvisioningUpdates"',
      parse: (val: string) => parse(val),
    },
    {
      name: '--device <string>',
      description:
        'Explicitly set the device or simulator to use by name or by UDID.',
    },
    {
      name: '--catalyst',
      description: 'Run on Mac Catalyst.',
    },
    {
      name: '--buildFolder <string>',
      description: `Location for ${readableName} build artifacts. Corresponds to Xcode's "-derivedDataPath".`,
      value: 'build',
    },
    {
      name: '--destination <string>',
      description: 'Explicitly extend destination e.g. "arch=x86_64"',
    },
    {
      name: '--archive',
      description:
        'Create an Xcode archive (IPA) of the build, required for uploading to App Store Connect or distributing to TestFlight',
    },
  ];
};
