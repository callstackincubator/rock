import { parseArgs } from '@rnef/tools';
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
  destination?: 'device' | 'simulator';
  destinations?: string[];
  archive?: boolean;
  installPods: boolean;
  newArch: boolean;
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
      description: 'Name of the export options file for archiving. Defaults to: ExportOptions.plist',
    },
    {
      name: '--build-folder <string>',
      description: `Location for ${readableName} build artifacts. Corresponds to Xcode's "-derivedDataPath".`,
      value: 'build',
    },
    {
      name: '--destination <string>',
      description:
        'Define whether to build for a generic device or generic simulator. Available values: "simulator", "device"',
    },
    {
      name: '--destinations <list>',
      description:
        'Explicitly defined destinations e.g. "arch=x86_64". You can also pass a comma separated array e.g. "generic/platform=iphoneos,generic/platform=iphonesimulator"',
      parse: (val: string) => val.split(','),
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
  ];
};
