import { parseArgs } from '@rock-js/tools';
import type { BuilderCommand } from '../../types/index.js';
import { getPlatformInfo } from '../../utils/getPlatformInfo.js';

export type BuildFlags = {
  verbose?: boolean;
  configuration?: string;
  scheme?: string;
  target?: string;
  extraParams?: string[];
  exportExtraParams?: string[];
  exportOptionsPlist?: string;
  buildFolder?: string;
  destination?: string[];
  archive?: boolean;
  installPods: boolean;
  newArch: boolean;
  local?: boolean;
};

export const getBuildOptions = ({ platformName }: BuilderCommand) => {
  const { readableName } = getPlatformInfo(platformName);

  return [
    {
      name: '--verbose',
      description: '',
    },
    {
      name: '--configuration <string>',
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
      parse: parseArgs,
    },
    {
      name: '--export-extra-params <string>',
      description:
        'Custom params that will be passed to xcodebuild export archive command.\n' +
        'Example:\n' +
        '  --export-extra-params "-allowProvisioningUpdates"',
      parse: parseArgs,
    },
    {
      name: '--export-options-plist <string>',
      description:
        'Name of the export options file for archiving. Defaults to: ExportOptions.plist',
    },
    {
      name: '--build-folder <string>',
      description: `Location for ${readableName} build artifacts. Corresponds to Xcode's "-derivedDataPath".`,
      value: 'build',
    },
    {
      name: '--destination <strings...>',
      description:
        'Define destination(s) for the build. You can pass multiple destinations as separate values or repeated use of the flag. Values can be either: "simulator", "device" or destinations supported by "xcodebuild -destination" flag, e.g. "generic/platform=iOS"',
    },
    {
      name: '--archive',
      description:
        'Create an Xcode archive (IPA) of the build, required for uploading to App Store Connect or distributing to TestFlight',
    },
    {
      name: '--no-install-pods',
      description: 'Skip automatic CocoaPods installation',
    },
    {
      name: '--no-new-arch',
      description: 'Run React Native in legacy async architecture.',
    },
    {
      name: '--local',
      description: 'Force local build with xcodebuild.',
    },
  ];
};
