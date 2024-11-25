import { BuilderCommand } from '../../types/index.js';
import { getPlatformInfo } from '../../utils/getPlatformInfo.js';

export type BuildFlags = {
  /**
   *
   */
  verbose?: boolean;

  /**
   * Explicitly select which scheme and configuration to use before running a build
   */
  interactive?: boolean;

  /**
   * Explicitly set the scheme configuration to use. This option is case sensitive.
   */
  mode?: string;

  /**
   * Explicitly set Xcode scheme to use
   */
  scheme?: string;

  /**
   * Explicitly set Xcode target to use
   */
  target?: string;

  /**
   * Custom params that will be passed to `xcodebuild` command
   */
  extraParams?: string[];

  /**
   * Explicitly set the device to use by name or by unique device identifier.
   * If the option without value is provided, the app will run on the first available physical device.
   */
  device?: string;

  /**
   * Custom build folder path
   */
  buildFolder?: string;
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
      name: '--device [string]',
      description:
        'Explicitly set the device to use by name or by unique device identifier. If the value is not provided,' +
        'the app will run on the first available physical device.',
    },
    {
      name: '--buildFolder <string>',
      description: `Location for ${readableName} build artifacts. Corresponds to Xcode's "-derivedDataPath".`,
    },
  ];
};
