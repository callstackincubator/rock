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

const buildOptions = getBuildOptions({ platformName: 'ios' });

export const pluginBrownfieldIosPackageAction = async (
  args: BuildFlags,
  apiSubset: Pick<
    PluginApi,
    | 'getReactNativeVersion'
    | 'getProjectRoot'
    | 'getReactNativePath'
    | 'getFingerprintOptions'
    | 'getRemoteCacheProvider'
    | 'getUsePrebuiltRNCore'
  >,
  pluginConfig?: IOSProjectConfig,
) => {
  intro('Packaging iOS project');

  // 1) Build the project
  const projectRoot = apiSubset.getProjectRoot();
  const iosConfig = getValidProjectConfig('ios', projectRoot, pluginConfig);
  const { derivedDataDir } = getBuildPaths('ios');

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
      reactNativePath: apiSubset.getReactNativePath(),
      brownfield: true,
      usePrebuiltRNCore: apiSubset.getUsePrebuiltRNCore(),
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
    reactNativeVersion: apiSubset.getReactNativeVersion(),
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
      action: (args: BuildFlags) =>
        pluginBrownfieldIosPackageAction(args, api, pluginConfig),
      options: buildOptions,
    });

    return {
      name: 'plugin-brownfield-ios',
      description: 'Rock plugin for brownfield iOS.',
    };
  };

export default pluginBrownfieldIos;
