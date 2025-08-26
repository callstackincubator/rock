import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { SubprocessError } from '@rock-js/tools';
import {
  color,
  colorLink,
  logger,
  note,
  outro,
  spawn,
  spinner,
} from '@rock-js/tools';
import { getPkgManager } from './getPkgManager.js';

export async function initInExistingProject(projectRoot: string) {
  const pkgManager = getPkgManager();

  const loader = spinner();

  // 1) Install Rock dev dependencies
  const rockPackages = [
    'rock',
    '@rock-js/plugin-metro',
    '@rock-js/platform-android',
    '@rock-js/platform-ios',
  ];

  loader.start(
    `Adding ${color.bold('Rock')} dependencies with ${color.bold(pkgManager)}`,
  );
  await addDevDependencies(projectRoot, pkgManager, rockPackages);
  loader.stop(`Added ${color.bold('Rock')} dependencies`);

  // 2) Remove community CLI deps
  const rnCliPackages = [
    '@react-native-community/cli',
    '@react-native-community/cli-platform-android',
    '@react-native-community/cli-platform-ios',
  ];
  loader.start(`Removing ${color.bold('React Native Community CLI')} packages`);
  await removeDependencies(projectRoot, pkgManager, rnCliPackages);
  loader.stop(`Removed ${color.bold('React Native Community CLI')} packages`);

  // 3) Ensure .gitignore includes .rock/
  loader.start(`Adding ${color.bold('.gitignore')} entry for .rock/`);
  ensureGitignoreEntry(projectRoot, '.rock/');
  loader.stop(`Added ${color.bold('.gitignore')} entry for .rock/`);

  // 4) Generate rock.config.mjs (optionally migrate a bit from react-native.config.js)
  loader.start(`Generating ${color.bold('rock.config.mjs')}`);
  const platformArgs = readPlatformArgsFromReactNativeConfig(projectRoot);
  createMigrationConfig(projectRoot, platformArgs);
  loader.stop(`Generated ${color.bold('rock.config.mjs')}`);

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

  // 6) Podfile changes
  loader.start(`Updating ${color.bold(`${iosSourceDir}/Podfile`)}`);
  updatePodfile(projectRoot, iosSourceDir);
  loader.stop(`Updated ${color.bold(`${iosSourceDir}/Podfile`)}`);

  // 7) Xcode project changes
  loader.start(`Updating ${color.bold(`${iosSourceDir}/project.pbxproj`)}`);
  updateXcodeProject(projectRoot, iosSourceDir);
  loader.stop(`Updated ${color.bold(`${iosSourceDir}/project.pbxproj`)}`);

  // 8) Update package.json scripts
  loader.start(`Updating ${color.bold('package.json')} scripts`);
  updatePackageJsonScripts(projectRoot);
  loader.stop(`Updated ${color.bold('package.json')} scripts`);

  note(
    [
      `1. Run ${color.bold('git diff')} to see the changes. Adjust as necessary e.g.:`,
      `  - paths in monorepo`,
      `  - commands in shell scripts`,
      `  - commands in CI workflows`,
      `2. Run the dev server as you would normally do`,
      `3. Run iOS and Android apps as you would normally do`,
      `4. Setup Remote Cache: ${colorLink('https://rockjs.dev/docs/configuration#remote-cache-configuration')}`,
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
    fs.appendFileSync(gitignorePath, `\n# Rock\n${entry}\n`);
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
  const rockConfigPath = path.join(projectRoot, 'rock.config.mjs');
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
import { platformIOS } from '@rock-js/platform-ios';
import { platformAndroid } from '@rock-js/platform-android';
import { pluginMetro } from '@rock-js/plugin-metro';

/** @type {import('rock').Config} */
export default {
  bundler: pluginMetro(),
  platforms: {
    ios: platformIOS${iosArgs},
    android: platformAndroid${androidArgs},
  },
  remoteCacheProvider: null,
};
`;

  fs.writeFileSync(rockConfigPath, content);
}

function updateAndroidBuildGradle(projectRoot: string, sourceDir: string) {
  const filePath = path.join(projectRoot, sourceDir, 'app', 'build.gradle');
  if (!fs.existsSync(filePath)) {
    return;
  }
  const desired = 'cliFile = file("../../node_modules/rock/dist/src/bin.js")';
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
    "extensions.configure(com.facebook.react.ReactSettingsExtension){ ex -> ex.autolinkLibrariesFromCommand(['npx', 'rock', 'config', '-p', 'android']) }";
  let replaced = content.replace(
    /extensions\.configure\(com\.facebook\.react\.ReactSettingsExtension\)\{[^}]*autolinkLibrariesFromCommand\([^)]*\)[^}]*\}/gs,
    target,
  );
  if (replaced === content) {
    // Try to replace only the inner call if block structure differs
    replaced = content.replace(
      /autolinkLibrariesFromCommand\([^)]*\)/g,
      "autolinkLibrariesFromCommand(['npx', 'rock', 'config', '-p', 'android'])",
    );
  }
  if (replaced !== content) {
    fs.writeFileSync(filePath, replaced);
  }
}

function updateXcodeProject(projectRoot: string, sourceDir: string) {
  const toReplace =
    'shellScript = "set -e\\n\\nWITH_ENVIRONMENT=\\"$REACT_NATIVE_PATH/scripts/xcode/with-environment.sh\\"\\nREACT_NATIVE_XCODE=\\"$REACT_NATIVE_PATH/scripts/react-native-xcode.sh\\"\\n\\n/bin/sh -c \\"$WITH_ENVIRONMENT $REACT_NATIVE_XCODE\\"\\n";';
  const expected =
    'shellScript = "set -e\\nif [[ -f \\"$PODS_ROOT/../.xcode.env\\" ]]; then\\nsource \\"$PODS_ROOT/../.xcode.env\\"\\nfi\\nif [[ -f \\"$PODS_ROOT/../.xcode.env.local\\" ]]; then\\nsource \\"$PODS_ROOT/../.xcode.env.local\\"\\nfi\\nexport CONFIG_CMD=\\"dummy-workaround-value\\"\\nexport CLI_PATH=\\"$(\\"$NODE_BINARY\\" --print \\"require(\'path\').dirname(require.resolve(\'rock/package.json\')) + \'/dist/src/bin.js\'\\")\\"\\nWITH_ENVIRONMENT=\\"$REACT_NATIVE_PATH/scripts/xcode/with-environment.sh\\"\\n";';

  const xcodeProjectFolder = fs
    .readdirSync(path.join(projectRoot, sourceDir))
    .find((file) => file.endsWith('.xcodeproj'));
  const xcodeProjectPath = xcodeProjectFolder
    ? path.join(projectRoot, sourceDir, xcodeProjectFolder, 'project.pbxproj')
    : undefined;

  if (!xcodeProjectPath) {
    logger.debug(`No Xcode project found in ${sourceDir}`);
    return;
  }
  const content = fs.readFileSync(xcodeProjectPath, 'utf8');
  const replaced = content.replace(toReplace, expected);
  if (replaced !== content) {
    fs.writeFileSync(xcodeProjectPath, replaced);
  } else {
    logger.warn(
      `Unable to update ${color.bold(xcodeProjectPath)}. 
Please update the "Bundle React Native code and images" build phase manually with:
  set -e
  if [[ -f "$PODS_ROOT/../.xcode.env" ]]; then
  source "$PODS_ROOT/../.xcode.env"
  fi
  if [[ -f "$PODS_ROOT/../.xcode.env.local" ]]; then
  source "$PODS_ROOT/../.xcode.env.local"
  fi
  export CONFIG_CMD="dummy-workaround-value"
  export CLI_PATH="$("$NODE_BINARY" --print "require('path').dirname(require.resolve('rock/package.json')) + '/dist/src/bin.js'")"
  WITH_ENVIRONMENT="$REACT_NATIVE_PATH/scripts/xcode/with-environment.sh"
`,
    );
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
    "$1(['npx', 'rock', 'config', '-p', 'ios'])$2",
  );
  if (
    !content.includes(`(['npx', 'rock', 'config', '-p', 'ios'])`) &&
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
    .replaceAll('react-native start', 'rock start')
    .replaceAll('react-native run-android', 'rock run:android')
    .replaceAll('react-native build-android', 'rock build:android')
    .replaceAll('react-native run-ios', 'rock run:ios')
    .replaceAll('react-native build-ios', 'rock build:ios')
    .replaceAll(/run:android(.*)--mode(.*)/g, 'run:android$1--variant$2')
    .replaceAll(/run:ios(.*)--mode(.*)/g, 'run:ios$1--configuration$2')
    .replaceAll(/build:android(.*)--mode(.*)/g, 'build:android$1--variant$2')
    .replaceAll(/build:ios(.*)--mode(.*)/g, 'build:ios$1--configuration$2')
    .replaceAll('--appIdSuffix', '--app-id-suffix')
    .replaceAll('--appId', '--app-id')
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
    bun: ['add', '-D', ...packages],
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
    bun: ['remove', ...packages],
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
