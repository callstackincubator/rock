import fs from 'node:fs';
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
import { copyReactXcframeworks } from './copyReactXcframeworks.js';

type AppleSdk = 'iphoneos' | 'iphonesimulator';

const ALL_SDKS: AppleSdk[] = ['iphoneos', 'iphonesimulator'];

// `--destination` narrows which slices Xcode emits, so the merges below must only
// look at the slices that were actually built.
function resolveSdksForDestination(destination: string): AppleSdk[] {
  const normalized = destination.trim().toLowerCase();

  if (normalized === 'device') {
    return ['iphoneos'];
  }

  if (normalized === 'simulator' || normalized.includes('simulator')) {
    return ['iphonesimulator'];
  }

  if (normalized.includes('platform=ios')) {
    return ['iphoneos'];
  }

  return ALL_SDKS;
}

function resolveDestinationSdks(destinations: string[]): AppleSdk[] {
  const sdks = new Set(destinations.flatMap(resolveSdksForDestination));

  return ALL_SDKS.filter((sdk) => sdks.has(sdk));
}

// `mergeFrameworks` also accepts a directory holding only the static library, which
// it wraps into a temporary framework.
function hasBuildProduct(directoryPath: string, frameworkName: string) {
  return (
    fs.existsSync(path.join(directoryPath, `${frameworkName}.framework`)) ||
    fs.existsSync(path.join(directoryPath, `lib${frameworkName}.a`))
  );
}

function collectFrameworkPaths({
  productsPath,
  configuration,
  sdks,
  frameworkName,
  productSubDir,
}: {
  productsPath: string;
  configuration: string;
  sdks: AppleSdk[];
  frameworkName: string;
  productSubDir?: string;
}): string[] {
  const searchedDirectories = sdks.map((sdk) =>
    path.join(
      productsPath,
      `${configuration}-${sdk}`,
      ...(productSubDir ? [productSubDir] : []),
    ),
  );

  const frameworkPaths = searchedDirectories
    .filter((directoryPath) => hasBuildProduct(directoryPath, frameworkName))
    .map((directoryPath) =>
      path.join(directoryPath, `${frameworkName}.framework`),
    );

  if (frameworkPaths.length === 0) {
    throw new RockError(
      `Could not find a build product for ${frameworkName} in the ${configuration} configuration. ` +
        `Looked for ${frameworkName}.framework or lib${frameworkName}.a in:\n` +
        searchedDirectories.map((dir) => `  - ${dir}`).join('\n') +
        `\nIf the build produced an .app instead of a framework, the wrong scheme was built; pass --scheme with your brownfield framework scheme.`,
    );
  }

  return frameworkPaths;
}

const buildOptions = getBuildOptions({ platformName: 'ios' });

export const packageIosAction = async (
  args: BuildFlags,
  {
    projectRoot,
    reactNativePath,
    reactNativeVersion,
    usePrebuiltRNCore,
    skipCache,
    packageDir,
  }: {
    projectRoot: string;
    reactNativePath: string;
    reactNativeVersion: string;
    usePrebuiltRNCore: boolean | undefined;
    skipCache?: boolean;
    packageDir?: string;
  },
  pluginConfig?: IOSProjectConfig,
) => {
  intro('Packaging iOS project');
  logger.setVerbose(args.verbose ?? false);

  // 1) Build the project
  const iosConfig = getValidProjectConfig('ios', projectRoot, pluginConfig);
  const destination = args.destination ?? [
    genericDestinations.ios.device,
    genericDestinations.ios.simulator,
  ];
  const sdks = resolveDestinationSdks(destination);

  const buildFolder = args.buildFolder ?? getBuildPaths('ios').derivedDataDir;
  const configuration = args.configuration ?? 'Debug';

  const { appPath, scheme } = await buildApp({
    projectRoot,
    projectConfig: iosConfig,
    platformName: 'ios',
    args: { ...args, destination, buildFolder },
    reactNativePath,
    brownfield: true,
    usePrebuiltRNCore,
    pluginConfig,
    skipCache,
  });

  if (!scheme) {
    throw new RockError(
      'Could not determine the framework name. Pass --scheme with your brownfield framework scheme.',
    );
  }

  logger.log(`Build available at: ${colorLink(relativeToCwd(appPath))}`);

  // 2) Merge the .framework outputs of the framework target
  const productsPath = path.join(buildFolder, 'Build', 'Products');
  const { sourceDir } = iosConfig;
  const frameworkTargetOutputDir =
    (packageDir &&
      (path.isAbsolute(packageDir)
        ? packageDir
        : path.join(sourceDir, packageDir))) ??
    getBuildPaths('ios').packageDir;

  await mergeFrameworks({
    sourceDir,
    frameworkPaths: collectFrameworkPaths({
      productsPath,
      configuration,
      sdks,
      frameworkName: scheme,
    }),
    outputPath: path.join(frameworkTargetOutputDir, `${scheme}.xcframework`),
  });

  // 3) Merge React Native Brownfield paths
  await mergeFrameworks({
    sourceDir,
    frameworkPaths: collectFrameworkPaths({
      productsPath,
      configuration,
      sdks,
      frameworkName: 'ReactBrownfield',
      productSubDir: 'ReactBrownfield',
    }),
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

  // 5) Copy React and ReactNativeDependencies xcframeworks to the output path
  copyReactXcframeworks({
    sourceDir,
    destinationDir: frameworkTargetOutputDir,
  });

  // 6) Inform the user
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
