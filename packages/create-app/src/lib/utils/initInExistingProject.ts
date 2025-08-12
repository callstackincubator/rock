import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { SubprocessError } from '@rnef/tools';
import {
  color,
  isInteractive,
  logger,
  note,
  outro,
  promptConfirm,
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

  // 5) Android file changes
  loader.start(
    `Updating ${color.bold('android/app/build.gradle')} and ${color.bold('android/settings.gradle')}`,
  );
  updateAndroidBuildGradle(projectRoot);
  updateAndroidSettingsGradle(projectRoot);
  loader.stop(
    `Updated ${color.bold('android/app/build.gradle')} and ${color.bold('android/settings.gradle')}`,
  );

  // 6) iOS file changes
  loader.start(`Updating ${color.bold('ios/Podfile')}`);
  updatePodfile(projectRoot);
  loader.stop(`Updated ${color.bold('ios/Podfile')}`);

  // 7) Update package.json scripts
  loader.start(`Updating ${color.bold('package.json')} scripts`);
  updatePackageJsonScripts(projectRoot);
  loader.stop(`Updated ${color.bold('package.json')} scripts`);

  // 8) Optionally clean native build artifacts
  if (isInteractive()) {
    const shouldClean = await promptConfirm({
      message: 'Clean native build artifacts (git clean -fdx ios/ android/)?',
      confirmLabel: 'Yes',
      cancelLabel: 'No',
    });
    if (shouldClean) {
      loader.start('Cleaning native build artifacts');
      try {
        await spawn('git', ['clean', '-fdx', 'ios/', 'android/'], {
          cwd: projectRoot,
        });
      } catch {
        // ignore if git not available or directories missing
      }
      loader.stop('Cleaned native build artifacts');
    }
  }

  note(
    [
      `1. Run \`git diff\` to see the changes. Adjust as necessary e.g.:`,
      `  - paths in monorepo`,
      `  - shell scripts`,
      `2. Run the dev server as you would normally do`,
      `3. Run iOS and Android apps as you would normally do`,
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
    fs.appendFileSync(
      gitignorePath,
      `
  # RNEF
  ${entry}
  `,
    );
    return;
  }
}

function readPlatformArgsFromReactNativeConfig(projectRoot: string): {
  ios?: { sourceDir?: string };
  android?: { appName?: string };
} {
  const rnConfigPath = path.join(projectRoot, 'react-native.config.js');
  if (!fs.existsSync(rnConfigPath)) {
    return {};
  }
  try {
    const requireFn = createRequire(import.meta.url);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rnConfig: any = requireFn(rnConfigPath);
    const project = rnConfig?.project ?? rnConfig?.default?.project;
    const ios = project?.ios ? { sourceDir: project.ios.sourceDir } : undefined;
    const android = project?.android
      ? { appName: project.android.appName }
      : undefined;
    return { ios, android };
  } catch {
    return {};
  }
}

function createMigrationConfig(
  projectRoot: string,
  platformArgs: {
    ios?: { sourceDir?: string };
    android?: { appName?: string };
  },
) {
  const rnefConfigPath = path.join(projectRoot, 'rnef.config.mjs');
  const iosArgs = platformArgs.ios?.sourceDir
    ? `( { sourceDir: '${platformArgs.ios.sourceDir}' } )`
    : '()';
  const androidArgs = platformArgs.android?.appName
    ? `( { appName: '${platformArgs.android.appName}' } )`
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

function updateAndroidBuildGradle(projectRoot: string) {
  const filePath = path.join(projectRoot, 'android', 'app', 'build.gradle');
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

function updateAndroidSettingsGradle(projectRoot: string) {
  const filePath = path.join(projectRoot, 'android', 'settings.gradle');
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

function updatePodfile(projectRoot: string) {
  const filePath = path.join(projectRoot, 'ios', 'Podfile');
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
