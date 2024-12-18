import { BuilderCommand } from '../../types/index.js';
import { getPlatformInfo } from '../../utils/getPlatformInfo.js';

export type BuildFlags = {
  verbose?: boolean;
  interactive?: boolean;
  mode: string;
  scheme: string;
  target?: string;
  extraParams?: string[];
  device?: string;
  catalyst?: boolean;
  buildFolder?: string;
  destination?: string;
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
      parse: (val: string) => val.split(' '),
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
  ];
};
