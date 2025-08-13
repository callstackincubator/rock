import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { SubprocessError } from '@rnef/tools';
import {
  color,
  colorLink,
  logger,
  note,
  outro,
  spawn,
  spinner,
} from '@rnef/tools';
import { getPkgManager } from './getPkgManager.js';

export async function initInExistingProject(projectRoot: string) {
  const pkgManager = getPkgManager();

  const loader = spinner();

  // 1) Install RNEF dev dependencies
  const rnefPackages = [
    '@rnef/cli',
    '@rnef/plugin-metro',
    '@rnef/platform-android',
    '@rnef/platform-ios',
  ];

  loader.start(`Adding ${color.bold('RNEF')} dependencies`);
  await addDevDependencies(projectRoot, pkgManager, rnefPackages);
  loader.stop(`Added ${color.bold('RNEF')} dependencies`);

  // 2) Remove community CLI deps
  const rnCliPackages = [
    '@react-native-community/cli',
    '@react-native-community/cli-platform-android',
    '@react-native-community/cli-platform-ios',
  ];
  loader.start(`Removing ${color.bold('React Native Community CLI')} packages`);
  await removeDependencies(projectRoot, pkgManager, rnCliPackages);
  loader.stop(`Removed ${color.bold('React Native Community CLI')} packages`);

  // 3) Ensure .gitignore includes .rnef/
  loader.start(`Adding ${color.bold('.gitignore')} entry for .rnef/`);
  ensureGitignoreEntry(projectRoot, '.rnef/');
  loader.stop(`Added ${color.bold('.gitignore')} entry for .rnef/`);

  // 4) Generate rnef.config.mjs (optionally migrate a bit from react-native.config.js)
  loader.start(`Generating ${color.bold('rnef.config.mjs')}`);
  const platformArgs = readPlatformArgsFromReactNativeConfig(projectRoot);
  createMigrationConfig(projectRoot, platformArgs);
  loader.stop(`Generated ${color.bold('rnef.config.mjs')}`);

  const iosSourceDir = platformArgs.ios?.sourceDir ?? 'ios';
  const androidSourceDir = platformArgs.android?.sourceDir ?? 'android';

  // 5) Android file changes
  loader.start(
    `Updating ${color.bold(`${androidSourceDir}/app/build.gradle`)} and ${color.bold(`${androidSourceDir}/settings.gradle`)}`,
  );
  updateAndroidBuildGradle(projectRoot, androidSourceDir);
  updateAndroidSettingsGradle(projectRoot, androidSourceDir);
  loader.stop(
    `Updated ${color.bold(`${androidSourceDir}/app/build.gradle`)} and ${color.bold(`${androidSourceDir}/settings.gradle`)}`,
  );

  // 6) iOS file changes
  loader.start(`Updating ${color.bold(`${iosSourceDir}/Podfile`)}`);
  updatePodfile(projectRoot, iosSourceDir);
  loader.stop(`Updated ${color.bold(`${iosSourceDir}/Podfile`)}`);

  // 7) Update package.json scripts
  loader.start(`Updating ${color.bold('package.json')} scripts`);
  updatePackageJsonScripts(projectRoot);
  loader.stop(`Updated ${color.bold('package.json')} scripts`);

  note(
    [
      `1. Run ${color.bold('git diff')} to see the changes. Adjust as necessary e.g.:`,
      `  - paths in monorepo`,
      `  - shell scripts`,
      `  - CI workflows`,
      `2. Run the dev server as you would normally do`,
      `3. Run iOS and Android apps as you would normally do`,
      `4. Setup Remote Cache: ${colorLink('https://rnef.dev/docs/configuration#remote-cache-configuration')}`,
    ].join('\n'),
    'Next steps',
  );
  outro('Success 🎉.');
}

function ensureGitignoreEntry(projectRoot: string, entry: string) {
  const gitignorePath = path.join(projectRoot, '.gitignore');
  if (
    fs.existsSync(gitignorePath) &&
    !fs.readFileSync(gitignorePath, 'utf8').includes(entry)
  ) {
    fs.appendFileSync(gitignorePath, `\n# RNEF\n${entry}\n`);
    return;
  }
}

function readPlatformArgsFromReactNativeConfig(projectRoot: string): {
  ios?: { sourceDir?: string };
  android?: { sourceDir?: string };
} {
  const rnConfigPath = path.join(projectRoot, 'react-native.config.js');
  if (!fs.existsSync(rnConfigPath)) {
    return {};
  }
  try {
    const require = createRequire(import.meta.url);
    const rnConfig = require(rnConfigPath);
    return { ios: rnConfig.project?.ios, android: rnConfig.project?.android };
  } catch {
    return {};
  }
}

function createMigrationConfig(
  projectRoot: string,
  platformArgs: {
    ios?: { sourceDir?: string };
    android?: { sourceDir?: string };
  },
) {
  const rnefConfigPath = path.join(projectRoot, 'rnef.config.mjs');
  const iosArgs = platformArgs.ios
    ? `({
      ${Object.entries(platformArgs.ios)
        .map(([key, value]) => `${key}: '${value}'`)
        .join(',\n      ')},
    })`
    : '()';
  const androidArgs = platformArgs.android
    ? `({
      ${Object.entries(platformArgs.android)
        .map(([key, value]) => `${key}: '${value}'`)
        .join(',\n      ')},
    })`
    : '()';

  const content = `// @ts-check
import { platformIOS } from '@rnef/platform-ios';
import { platformAndroid } from '@rnef/platform-android';
import { pluginMetro } from '@rnef/plugin-metro';

/** @type {import('@rnef/cli').Config} */
export default {
  bundler: pluginMetro(),
  platforms: {
    ios: platformIOS${iosArgs},
    android: platformAndroid${androidArgs},
  },
  remoteCacheProvider: null,
};
`;

  fs.writeFileSync(rnefConfigPath, content);
}

function updateAndroidBuildGradle(projectRoot: string, sourceDir: string) {
  const filePath = path.join(projectRoot, sourceDir, 'app', 'build.gradle');
  if (!fs.existsSync(filePath)) {
    return;
  }
  const desired =
    'cliFile = file("../../node_modules/@rnef/cli/dist/src/bin.js")';
  const content = fs.readFileSync(filePath, 'utf8');
  const replaced = content.replace(
    /\/\/\s+cliFile\s*=\s*file\([^)]*\)/g,
    desired,
  );

  if (!content.includes(desired) && replaced !== content) {
    fs.writeFileSync(filePath, replaced);
    return;
  }
}

function updateAndroidSettingsGradle(projectRoot: string, sourceDir: string) {
  const filePath = path.join(projectRoot, sourceDir, 'settings.gradle');
  if (!fs.existsSync(filePath)) {
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const target =
    "extensions.configure(com.facebook.react.ReactSettingsExtension){ ex -> ex.autolinkLibrariesFromCommand(['npx', 'rnef', 'config', '-p', 'android']) }";
  let replaced = content.replace(
    /extensions\.configure\(com\.facebook\.react\.ReactSettingsExtension\)\{[^}]*autolinkLibrariesFromCommand\([^)]*\)[^}]*\}/gs,
    target,
  );
  if (replaced === content) {
    // Try to replace only the inner call if block structure differs
    replaced = content.replace(
      /autolinkLibrariesFromCommand\([^)]*\)/g,
      "autolinkLibrariesFromCommand(['npx', 'rnef', 'config', '-p', 'android'])",
    );
  }
  if (replaced !== content) {
    fs.writeFileSync(filePath, replaced);
  }
}

function updatePodfile(projectRoot: string, sourceDir: string) {
  const filePath = path.join(projectRoot, sourceDir, 'Podfile');
  if (!fs.existsSync(filePath)) {
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const replaced = content.replace(
    /(config\s*=\s*use_native_modules!)(\s*)/g,
    "$1(['npx', 'rnef', 'config', '-p', 'ios'])$2",
  );
  if (
    !content.includes(`(['npx', 'rnef', 'config', '-p', 'ios'])`) &&
    replaced !== content
  ) {
    fs.writeFileSync(filePath, replaced);
  }
}

function updatePackageJsonScripts(projectRoot: string) {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return;
  }
  const content = fs.readFileSync(packageJsonPath, 'utf8');
  const replaced = content
    .replaceAll('react-native run-android', 'rnef run:android')
    .replaceAll('react-native build-android', 'rnef build:android')
    .replaceAll('react-native run-ios', 'rnef run:ios')
    .replaceAll('react-native build-ios', 'rnef build:ios')
    .replaceAll(/run:android(.*)--mode(.*)/g, 'run:android$1--variant$2')
    .replaceAll(/run:ios(.*)--mode(.*)/g, 'run:ios$1--configuration$2')
    .replaceAll(/build:android(.*)--mode(.*)/g, 'build:android$1--variant$2')
    .replaceAll(/build:ios(.*)--mode(.*)/g, 'build:ios$1--configuration$2')
    .replaceAll('--appId', '--app-id')
    .replaceAll('--appIdSuffix', '--app-id-suffix')
    .replaceAll('--buildFolder', '--build-folder');

  fs.writeFileSync(packageJsonPath, replaced);
}

async function addDevDependencies(
  projectRoot: string,
  pkgManager: string,
  packages: string[],
) {
  const argsByManager: Record<string, string[]> = {
    npm: ['install', '-D', ...packages],
    pnpm: ['add', '-D', ...packages],
    yarn: ['add', '-D', ...packages],
  };
  const args = argsByManager[pkgManager] ?? ['install', '-D', ...packages];
  await spawn(pkgManager, args, { cwd: projectRoot });
}

async function removeDependencies(
  projectRoot: string,
  pkgManager: string,
  packages: string[],
) {
  const argsByManager: Record<string, string[]> = {
    npm: ['remove', ...packages],
    pnpm: ['remove', ...packages],
    yarn: ['remove', ...packages],
  };
  const args = argsByManager[pkgManager] ?? ['remove', ...packages];
  try {
    await spawn(pkgManager, args, { cwd: projectRoot });
  } catch (error) {
    logger.debug(
      (error as SubprocessError).message,
      'Continuing with the rest of the steps\n',
    );
  }
}
