import fs from 'node:fs';
import path from 'node:path';
import type { SubprocessError } from '@rock-js/tools';
import { color, logger, note, outro, spawn, spinner } from '@rock-js/tools';
import { getPkgManagerFromLockFile } from './getPkgManager.js';

async function migrateRnefProject(projectRoot: string): Promise<void> {
  const pkgManager = getPkgManagerFromLockFile();
  const loader = spinner();

  const packagesMap: Record<string, string> = {
    '@rnef/cli': 'rock',
    '@rnef/platform-android': '@rock-js/platform-android',
    '@rnef/platform-ios': '@rock-js/platform-ios',
    '@rnef/plugin-metro': '@rock-js/plugin-metro',
    '@rnef/plugin-repack': '@rock-js/plugin-repack',
    '@rnef/provider-github': '@rock-js/provider-github',
    '@rnef/provider-s3': '@rock-js/provider-s3',
    '@rnef/welcome-screen': '@rock-js/welcome-screen',
  };

  const rnefDependencies = collectCurrentRnefDependencies(projectRoot);

  // 1) Remove RNEF packages and add Rock counterparts
  loader.start(`Removing ${color.bold('RNEF')} packages`);
  await removeDependencies(projectRoot, pkgManager, rnefDependencies);
  loader.stop(`Removed ${color.bold('RNEF')} packages`);

  loader.start(
    `Adding ${color.bold('Rock')} packages with ${color.bold(pkgManager)}`,
  );
  await addDevDependencies(
    projectRoot,
    pkgManager,
    rnefDependencies.map((dependency) => packagesMap[dependency]),
  );
  loader.stop(`Added ${color.bold('Rock')} packages`);

  // 2) Update .gitignore
  loader.start(`Updating ${color.bold('.gitignore')}`);
  updateGitignore(projectRoot);
  loader.stop(`Updated ${color.bold('.gitignore')}`);

  // 3) Rename .rnef/ directory to .rock/
  loader.start(`Updating cache`);
  renameRnefDirectory(projectRoot);
  updateCacheFilenames(projectRoot);
  loader.stop(`Updated cache`);

  // 4) Rename and update rnef.config.mjs
  loader.start(
    `Renaming and updating ${color.bold('rnef.config.mjs')} to ${color.bold('rock.config.mjs')}`,
  );
  renameAndUpdateConfig(projectRoot);
  loader.stop(
    `Renamed and updated ${color.bold('rnef.config.mjs')} to ${color.bold('rock.config.mjs')}`,
  );

  // 5) Update Android build.gradle
  loader.start(`Updating ${color.bold('android/app/build.gradle')}`);
  updateAndroidBuildGradle(projectRoot);
  loader.stop(`Updated ${color.bold('android/app/build.gradle')}`);

  // 6) Update iOS Podfile
  loader.start(`Updating ${color.bold('ios/Podfile')}`);
  updatePodfile(projectRoot);
  loader.stop(`Updated ${color.bold('ios/Podfile')}`);

  // 7) Update Android settings.gradle
  loader.start(`Updating ${color.bold('android/settings.gradle')}`);
  updateAndroidSettingsGradle(projectRoot);
  loader.stop(`Updated ${color.bold('android/settings.gradle')}`);

  // 8) Update Xcode project.pbxproj
  loader.start(`Updating ${color.bold('ios/project.pbxproj')}`);
  updateXcodeProject(projectRoot);
  loader.stop(`Updated ${color.bold('ios/project.pbxproj')}`);

  // 9) Update package.json scripts
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
      `4. Setup Remote Cache: ${color.bold('https://rockjs.dev/docs/configuration#remote-cache-configuration')}`,
    ].join('\n'),
    'Next steps',
  );
  outro('RNEF to Rock migration completed successfully 🎉.');
}

function collectCurrentRnefDependencies(projectRoot: string) {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const rnefDependencies = Object.keys(packageJson.dependencies).filter(
    (dependency) => dependency.startsWith('@rnef/'),
  );
  const rnefDevDependencies = Object.keys(packageJson.devDependencies).filter(
    (dependency) => dependency.startsWith('@rnef/'),
  );
  return [...rnefDependencies, ...rnefDevDependencies];
}

function updateGitignore(projectRoot: string) {
  const gitignorePath = path.join(projectRoot, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    let content = fs.readFileSync(gitignorePath, 'utf8');
    content = content.replace(/\.rnef\//g, '.rock/');
    fs.writeFileSync(gitignorePath, content);
  }
}

function renameRnefDirectory(projectRoot: string) {
  const rnefPath = path.join(projectRoot, '.rnef');
  const rockPath = path.join(projectRoot, '.rock');

  if (fs.existsSync(rnefPath)) {
    if (fs.existsSync(rockPath)) {
      // If .rock already exists, remove it first
      fs.rmSync(rockPath, { recursive: true, force: true });
    }
    fs.renameSync(rnefPath, rockPath);
  }
}

function updateCacheFilenames(projectRoot: string) {
  const cachePath = path.join(projectRoot, '.rock', 'cache', 'remote-build');
  if (!fs.existsSync(cachePath)) {
    return;
  }

  const files = fs.readdirSync(cachePath);
  files.forEach((file) => {
    if (file.includes('rnef')) {
      const newName = file.replace(/rnef/g, 'rock');
      const oldPath = path.join(cachePath, file);
      const newPath = path.join(cachePath, newName);
      fs.renameSync(oldPath, newPath);
    }
  });
}

function renameAndUpdateConfig(projectRoot: string) {
  const rnefConfigPath = path.join(projectRoot, 'rnef.config.mjs');
  const rockConfigPath = path.join(projectRoot, 'rock.config.mjs');

  if (fs.existsSync(rnefConfigPath)) {
    let content = fs.readFileSync(rnefConfigPath, 'utf8');

    // Replace package names
    content = content.replace(/@rnef\//g, '@rock-js/');
    content = content.replace(/@rnef\/cli/g, 'rock');

    // Write to new file
    fs.writeFileSync(rockConfigPath, content);

    // Remove old file
    fs.unlinkSync(rnefConfigPath);
  }
}

function updateAndroidBuildGradle(projectRoot: string) {
  const filePath = path.join(projectRoot, 'android', 'app', 'build.gradle');
  if (!fs.existsSync(filePath)) {
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(
    /@rnef\/cli\/dist\/src\/bin\.js/g,
    'rock/dist/src/bin.js',
  );
  fs.writeFileSync(filePath, content);
}

function updatePodfile(projectRoot: string) {
  const filePath = path.join(projectRoot, 'ios', 'Podfile');
  if (!fs.existsSync(filePath)) {
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/rnef/g, 'rock');
  fs.writeFileSync(filePath, content);
}

function updateAndroidSettingsGradle(projectRoot: string) {
  const filePath = path.join(projectRoot, 'android', 'settings.gradle');
  if (!fs.existsSync(filePath)) {
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/rnef/g, 'rock');
  fs.writeFileSync(filePath, content);
}

function updateXcodeProject(projectRoot: string) {
  const iosPath = path.join(projectRoot, 'ios');
  if (!fs.existsSync(iosPath)) {
    return;
  }

  const xcodeProjectFolder = fs
    .readdirSync(iosPath)
    .find((file) => file.endsWith('.xcodeproj'));

  if (!xcodeProjectFolder) {
    return;
  }

  const xcodeProjectPath = path.join(
    iosPath,
    xcodeProjectFolder,
    'project.pbxproj',
  );
  if (!fs.existsSync(xcodeProjectPath)) {
    return;
  }

  let content = fs.readFileSync(xcodeProjectPath, 'utf8');
  content = content.replace(/@rnef\/cli/g, 'rock');
  fs.writeFileSync(xcodeProjectPath, content);
}

function updatePackageJsonScripts(projectRoot: string) {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return;
  }

  let content = fs.readFileSync(packageJsonPath, 'utf8');
  content = content.replace(/rnef/g, 'rock');
  fs.writeFileSync(packageJsonPath, content);
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

export { migrateRnefProject };
