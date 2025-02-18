import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { loadConfigAsync } from '@react-native-community/cli-config';
import { getProjectConfig } from '@react-native-community/cli-config-apple';
import type {
  DependencyConfig,
  IOSDependencyConfig,
} from '@react-native-community/cli-types';
import { cacheManager, RnefError } from '@rnef/tools';
import color from 'picocolors';
import type { ProjectConfig } from '../../types/index.js';
import type { ApplePlatform } from '../../types/index.js';
import installPods from './installPods.js';

interface NativeDependencies {
  [key: string]: DependencyConfig;
}

function loadPackageJSON(root: string) {
  const packageJSONPath = path.join(root, 'package.json');
  const packageJSONContent = readFileSync(packageJSONPath, 'utf-8');
  const packageJSON = JSON.parse(packageJSONContent);
  return packageJSON;
}

function getPlatformDependencies(
  dependencies: NativeDependencies,
  platformName: ApplePlatform
) {
  return Object.keys(dependencies)
    .filter((dependency) => dependencies[dependency].platforms?.[platformName])
    .map(
      (dependency) =>
        `${dependency}@${
          (
            dependencies[dependency].platforms?.[
              platformName
            ] as IOSDependencyConfig
          ).version
        }`
    )
    .sort();
}

function generateMd5Hash(text: string) {
  return createHash('md5').update(text).digest('hex');
}

function compareMd5Hashes(hash1: string, hash2: string) {
  return hash1 === hash2;
}

function generateDependenciesHash(deps: string[]) {
  return generateMd5Hash(JSON.stringify(deps));
}

export default async function resolvePods(
  projectRoot: string,
  platformName: ApplePlatform,
  projectConfig: ProjectConfig
): Promise<ProjectConfig> {
  const { xcodeProject, sourceDir } = projectConfig;

  if (!xcodeProject) {
    throw new RnefError(
      `Could not find Xcode project files in "${sourceDir}" folder. Please make sure that you have installed Cocoapods and "${sourceDir}" is a valid path`
    );
  }

  const packageJson = await loadPackageJSON(projectRoot);
  const packageJSONDependenciesHash = generateDependenciesHash(
    Object.keys(packageJson.dependencies || {})
  );

  const podfilePath = path.join(sourceDir, 'Podfile');
  const podfile = podfilePath ? readFileSync(podfilePath, 'utf-8') : '';
  const podfileHash = generateMd5Hash(podfile);

  const podfileLockPath = podfilePath
    ? podfilePath.replace('.podfile', '.podfile.lock')
    : '';
  const podfileLock = podfileLockPath
    ? readFileSync(podfileLockPath, 'utf-8')
    : '';

  const podfileLockHash = generateMd5Hash(podfileLock);

  const podsPath = path.join(sourceDir, 'Pods');
  const arePodsInstalled = existsSync(podsPath);

  const config = await loadConfigAsync({
    selectedPlatform: platformName,
  });

  // There's a possibility to define a custom dependencies in `react-native.config.js`, that contain native code for a platform and that should also trigger install CocoaPods
  const platformDependencies = getPlatformDependencies(
    config.dependencies,
    platformName as ApplePlatform
  );
  const platformDependenciesHash =
    generateDependenciesHash(platformDependencies);

  const cachedDependenciesHash = cacheManager.get(
    `${packageJson['name']}-dependencies`
  );

  const currentDependenciesHash = generateDependenciesHash([
    podfileHash,
    podfileLockHash,
    platformDependenciesHash,
    packageJSONDependenciesHash,
  ]);

  if (
    !compareMd5Hashes(currentDependenciesHash, cachedDependenciesHash || '') ||
    !arePodsInstalled
  ) {
    try {
      await installPods({
        skipBundleInstall: !!cachedDependenciesHash, // run `bundle install` only at the first time
        platformProjectPath: sourceDir,
      });
      cacheManager.set(
        `${packageJson['name']}-dependencies`,
        currentDependenciesHash
      );
    } catch {
      const relativePath = path.relative(process.cwd(), sourceDir);

      const command = cachedDependenciesHash
        ? `cd ${relativePath} && bundle exec pod install`
        : `bundle install && cd ${relativePath} && bundle exec pod install`;

      throw new RnefError(
        `Something went wrong while installing CocoaPods. Please run ${color.bold(
          command
        )} manually`
      );
    }
  }

  if (!xcodeProject.isWorkspace) {
    const newProjectConfig = getProjectConfig({ platformName })(
      projectRoot,
      {}
    );

    if (newProjectConfig) {
      return newProjectConfig;
    } else {
      throw new RnefError('Project config not found');
    }
  }

  return projectConfig;
}
