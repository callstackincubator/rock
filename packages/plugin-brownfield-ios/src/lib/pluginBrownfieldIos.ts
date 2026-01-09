import path from 'node:path';
import type { IOSProjectConfig } from '@react-native-community/cli-types';
import type { PluginApi, PluginOutput } from '@rock-js/config';
import {
  buildApp,
  type BuildFlags,
  genericDestinations,
  getBuildOptions,
  getBuildPaths,
  getValidProjectConfig,
  mergeFrameworks,
  type ProjectConfig as AppleProjectConfig,
} from '@rock-js/platform-apple-helpers';
import {
  colorLink,
  intro,
  logger,
  outro,
  relativeToCwd,
  RockError,
} from '@rock-js/tools';
import { copyHermesXcframework } from './copyHermesXcframework.js';
import type { RequireAllOrNone } from './types.js';

const buildOptions = getBuildOptions({ platformName: 'ios' });

export const packageIosAction = async (
  args: BuildFlags,
  {
    projectRoot,
    reactNativePath,
    reactNativeVersion,
    usePrebuiltRNCore,
  }: {
    projectRoot: string;
    reactNativePath: string;
    reactNativeVersion: string;
    usePrebuiltRNCore: number | undefined;
  },
  pluginConfig?: IOSProjectConfig,
  /**
   * Rock-dependent logic escape hatch.
   * If this is not provided, the logic will depend on the presence of a Rock config file.
   */
  {
    iosConfigOverride,
    derivedDataDirOverride,
  }: RequireAllOrNone<{
    /**
     * Override for iOS project config.
     */
    iosConfigOverride: AppleProjectConfig;

    /**
     * Override for derivedDataDir path.
     */
    derivedDataDirOverride: string;
  }> = {},
) => {
  intro('Packaging iOS project');

  // 1) Build the project
  const iosConfig =
    iosConfigOverride ??
    getValidProjectConfig('ios', projectRoot, pluginConfig);

  const { derivedDataDir } = derivedDataDirOverride
    ? { derivedDataDir: derivedDataDirOverride }
    : getBuildPaths('ios');
  const destination = args.destination ?? [
    genericDestinations.ios.device,
    genericDestinations.ios.simulator,
  ];

  const buildFolder = args.buildFolder ?? derivedDataDir;
  const configuration = args.configuration ?? 'Debug';
  let scheme;

  try {
    const { appPath, ...buildAppResult } = await buildApp({
      projectRoot,
      projectConfig: iosConfig,
      platformName: 'ios',
      args: { ...args, destination, buildFolder },
      reactNativePath,
      brownfield: true,
      usePrebuiltRNCore,
    });
    logger.log(`Build available at: ${colorLink(relativeToCwd(appPath))}`);

    scheme = buildAppResult.scheme;
  } catch (error) {
    const message = `Failed to create ${args.archive ? 'archive' : 'build'}`;
    throw new RockError(message, { cause: error });
  }

  // 2) Merge the .framework outputs of the framework target
  const productsPath = path.join(buildFolder, 'Build', 'Products');
  const { packageDir: frameworkTargetOutputDir } = getBuildPaths('ios');
  const { sourceDir } = iosConfig;

  await mergeFrameworks({
    sourceDir,
    frameworkPaths: [
      path.join(
        productsPath,
        `${configuration}-iphoneos`,
        `${scheme}.framework`,
      ),
      path.join(
        productsPath,
        `${configuration}-iphonesimulator`,
        `${scheme}.framework`,
      ),
    ],
    outputPath: path.join(frameworkTargetOutputDir, `${scheme}.xcframework`),
  });

  // 3) Merge React Native Brownfield paths
  await mergeFrameworks({
    sourceDir,
    frameworkPaths: [
      path.join(
        productsPath,
        `${configuration}-iphoneos`,
        'ReactBrownfield',
        'ReactBrownfield.framework',
      ),
      path.join(
        productsPath,
        `${configuration}-iphonesimulator`,
        'ReactBrownfield',
        'ReactBrownfield.framework',
      ),
    ],
    outputPath: path.join(
      frameworkTargetOutputDir,
      'ReactBrownfield.xcframework',
    ),
  });

  // 4) Copy hermes xcframework to the output path
  copyHermesXcframework({
    sourceDir,
    destinationDir: frameworkTargetOutputDir,
    reactNativeVersion,
  });

  // 5) Inform the user
  logger.log(
    `XCFrameworks are available at: ${colorLink(
      relativeToCwd(frameworkTargetOutputDir),
    )}`,
  );

  outro('Success 🎉.');
};

export const pluginBrownfieldIos =
  (pluginConfig?: IOSProjectConfig) =>
  (api: PluginApi): PluginOutput => {
    api.registerCommand({
      name: 'package:ios',
      description: 'Emit a .xcframework file from React Native code.',
      action: async (args: BuildFlags) =>
        packageIosAction(
          args,
          {
            projectRoot: api.getProjectRoot(),
            reactNativePath: api.getReactNativePath(),
            reactNativeVersion: api.getReactNativeVersion(),
            usePrebuiltRNCore: api.getUsePrebuiltRNCore(),
          },
          pluginConfig,
        ),
      options: buildOptions,
    });

    return {
      name: 'plugin-brownfield-ios',
      description: 'Rock plugin for brownfield iOS.',
    };
  };

export default pluginBrownfieldIos;
