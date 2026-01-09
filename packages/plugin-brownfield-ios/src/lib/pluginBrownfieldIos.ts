import path from 'node:path';
import type { IOSProjectConfig } from '@react-native-community/cli-types';
import type { PluginApi, PluginOutput } from '@rock-js/config';
import {
  type BuildFlags,
  createBuild,
  genericDestinations,
  getBuildOptions,
  getBuildPaths,
  getValidProjectConfig,
  mergeFrameworks,
} from '@rock-js/platform-apple-helpers';
import type { FingerprintSources, RemoteBuildCache } from '@rock-js/tools';
import { colorLink, intro, logger, outro, relativeToCwd } from '@rock-js/tools';
import { copyHermesXcframework } from './copyHermesXcframework.js';

const buildOptions = getBuildOptions({ platformName: 'ios' });

export const packageIosAction = async (
  args: BuildFlags,
  {
    projectRoot,
    reactNativePath,
    reactNativeVersion,
    fingerprintOptions,
    remoteCacheProvider,
    usePrebuiltRNCore,
  }: {
    projectRoot: string;
    reactNativePath: string;
    reactNativeVersion: string;
    fingerprintOptions: FingerprintSources;
    remoteCacheProvider: null | (() => RemoteBuildCache) | undefined;
    usePrebuiltRNCore: number | undefined;
  },
  pluginConfig?: IOSProjectConfig,
) => {
  intro('Packaging iOS project');

  // 1) Build the project
  const iosConfig = getValidProjectConfig('ios', projectRoot, pluginConfig);
  const { derivedDataDir } = getBuildPaths('ios');

  const destination = args.destination ?? [
    genericDestinations.ios.device,
    genericDestinations.ios.simulator,
  ];

  const buildFolder = args.buildFolder ?? derivedDataDir;
  const configuration = args.configuration ?? 'Debug';

  const { sourceDir } = iosConfig;

  const { scheme } = await createBuild({
    platformName: 'ios',
    projectConfig: iosConfig,
    args: { ...args, destination, buildFolder },
    projectRoot,
    reactNativePath,
    fingerprintOptions,
    brownfield: true,
    remoteCacheProvider,
    usePrebuiltRNCore,
  });

  // 2) Merge the .framework outputs of the framework target
  const productsPath = path.join(buildFolder, 'Build', 'Products');
  const { packageDir: frameworkTargetOutputDir } = getBuildPaths('ios');

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
            fingerprintOptions: api.getFingerprintOptions(),
            remoteCacheProvider: await api.getRemoteCacheProvider(),
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
