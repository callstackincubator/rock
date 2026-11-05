// Expo Config Plugin that re-applies Rock's autolinking patches on
// every `expo prebuild`. Designed to live in `app.config.ts plugins:
// ['@rock-js/plugin-expo-config-plugins']` so the patches survive
// Expo CNG (Continuous Native Generation) regenerating `ios/` and
// `android/` from scratch.
//
// Mirrors the one-shot transforms in
// `packages/create-app/src/lib/utils/initInExistingProject.ts`:
//   - iOS Podfile        — point `use_native_modules!` at Rock
//   - Android build.gradle — point `cliFile` at Rock's bin.js
//   - Android settings.gradle — point `autolinkLibrariesFromCommand`
//                                at Rock
//   - Xcode project.pbxproj — rewrite the React Native build phase
//                              shellScript to source Rock's CLI
//
// Each step is idempotent so repeated prebuilds don't break.

import { type ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ----- iOS / Podfile ---------------------------------------------------------

export function patchPodfile(content: string): string {
  if (content.includes(`(['npx', 'rock', 'config', '-p', 'ios'])`)) {
    // Already patched — leave alone (idempotent).
    return content;
  }
  return content.replace(
    /(config\s*=\s*use_native_modules!)(\s*\([^)]*\))?/g,
    "$1(['npx', 'rock', 'config', '-p', 'ios'])",
  );
}

const withRockIosPodfile: ConfigPlugin = (config) =>
  withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      if (!fs.existsSync(podfilePath)) return cfg;
      const original = await fs.promises.readFile(podfilePath, 'utf8');
      const patched = patchPodfile(original);
      if (patched !== original) {
        await fs.promises.writeFile(podfilePath, patched);
      }
      return cfg;
    },
  ]);

// ----- iOS / Xcode project.pbxproj ------------------------------------------

const XCODE_REACT_PHASE_TARGET =
  'shellScript = "set -e\\nif [[ -f \\"$PODS_ROOT/../.xcode.env\\" ]]; then\\nsource \\"$PODS_ROOT/../.xcode.env\\"\\nfi\\nif [[ -f \\"$PODS_ROOT/../.xcode.env.local\\" ]]; then\\nsource \\"$PODS_ROOT/../.xcode.env.local\\"\\nfi\\nexport CONFIG_CMD=\\"dummy-workaround-value\\"\\nexport CLI_PATH=\\"$(\\"$NODE_BINARY\\" --print \\"require(\'path\').dirname(require.resolve(\'rock/package.json\')) + \'/dist/src/bin.js\'\\")\\"\\nWITH_ENVIRONMENT=\\"$REACT_NATIVE_PATH/scripts/xcode/with-environment.sh\\"\\n";';

const XCODE_REACT_PHASE_SOURCES = [
  // Default Expo / Community-CLI format
  'shellScript = "set -e\\n\\nWITH_ENVIRONMENT=\\"$REACT_NATIVE_PATH/scripts/xcode/with-environment.sh\\"\\nREACT_NATIVE_XCODE=\\"$REACT_NATIVE_PATH/scripts/react-native-xcode.sh\\"\\n\\n/bin/sh -c \\"$WITH_ENVIRONMENT $REACT_NATIVE_XCODE\\"\\n";',
  // RN 0.83 format
  'shellScript = "set -e\\n\\nWITH_ENVIRONMENT=\\"$REACT_NATIVE_PATH/scripts/xcode/with-environment.sh\\"\\nREACT_NATIVE_XCODE=\\"$REACT_NATIVE_PATH/scripts/react-native-xcode.sh\\"\\n\\n/bin/sh -c \\"\\\\\\"$WITH_ENVIRONMENT\\\\\\" \\\\\\"$REACT_NATIVE_XCODE\\\\\\"\\"\\n";',
];

export function patchXcodeProject(content: string): string {
  if (content.includes(XCODE_REACT_PHASE_TARGET)) {
    return content;
  }
  for (const source of XCODE_REACT_PHASE_SOURCES) {
    if (content.includes(source)) {
      return content.replace(source, XCODE_REACT_PHASE_TARGET);
    }
  }
  return content;
}

const withRockIosXcode: ConfigPlugin = (config) =>
  withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const iosDir = cfg.modRequest.platformProjectRoot;
      const xcodeProjectFolder = (await fs.promises.readdir(iosDir)).find((f) =>
        f.endsWith('.xcodeproj'),
      );
      if (!xcodeProjectFolder) return cfg;
      const projectPath = path.join(iosDir, xcodeProjectFolder, 'project.pbxproj');
      if (!fs.existsSync(projectPath)) return cfg;
      const original = await fs.promises.readFile(projectPath, 'utf8');
      const patched = patchXcodeProject(original);
      if (patched !== original) {
        await fs.promises.writeFile(projectPath, patched);
      }
      return cfg;
    },
  ]);

// ----- Android / app/build.gradle -------------------------------------------

const ANDROID_CLI_FILE_TARGET = 'cliFile = file("../../node_modules/rock/dist/src/bin.js")';

export function patchAndroidBuildGradle(content: string): string {
  if (content.includes(ANDROID_CLI_FILE_TARGET)) {
    return content;
  }
  return content.replace(
    /(?:\/\/\s+)?cliFile\s*=\s*file\([^)]*\)/g,
    ANDROID_CLI_FILE_TARGET,
  );
}

// ----- Android / settings.gradle --------------------------------------------

const ANDROID_AUTOLINK_TARGET =
  "autolinkLibrariesFromCommand(['npx', 'rock', 'config', '-p', 'android'])";

export function patchAndroidSettingsGradle(content: string): string {
  if (content.includes(ANDROID_AUTOLINK_TARGET)) {
    return content;
  }
  // Try the full block first (`extensions.configure(...) { ... }`)…
  const blockPattern =
    /extensions\.configure\(com\.facebook\.react\.ReactSettingsExtension\)\{[^}]*autolinkLibrariesFromCommand\([^)]*\)[^}]*\}/gs;
  const blockReplacement = `extensions.configure(com.facebook.react.ReactSettingsExtension){ ex -> ex.${ANDROID_AUTOLINK_TARGET} }`;
  if (blockPattern.test(content)) {
    return content.replace(blockPattern, blockReplacement);
  }
  // …otherwise fall back to replacing just the inner call.
  return content.replace(/autolinkLibrariesFromCommand\([^)]*\)/g, ANDROID_AUTOLINK_TARGET);
}

const withRockAndroid: ConfigPlugin = (config) =>
  withDangerousMod(config, [
    'android',
    async (cfg) => {
      const androidDir = cfg.modRequest.platformProjectRoot;
      const appBuildGradlePath = path.join(androidDir, 'app', 'build.gradle');
      const settingsGradlePath = path.join(androidDir, 'settings.gradle');

      if (fs.existsSync(appBuildGradlePath)) {
        const original = await fs.promises.readFile(appBuildGradlePath, 'utf8');
        const patched = patchAndroidBuildGradle(original);
        if (patched !== original) {
          await fs.promises.writeFile(appBuildGradlePath, patched);
        }
      }
      if (fs.existsSync(settingsGradlePath)) {
        const original = await fs.promises.readFile(settingsGradlePath, 'utf8');
        const patched = patchAndroidSettingsGradle(original);
        if (patched !== original) {
          await fs.promises.writeFile(settingsGradlePath, patched);
        }
      }
      return cfg;
    },
  ]);

// ----- Top-level plugin -----------------------------------------------------

/**
 * Expo Config Plugin that re-applies Rock's autolinking patches to the
 * native dirs generated by `expo prebuild`. Add it once to
 * `app.config.ts` `plugins`:
 *
 *   plugins: [
 *     '@rock-js/plugin-expo-config-plugins/withRockAutolinking',
 *     // …
 *   ],
 *
 * Idempotent — repeated `expo prebuild --clean` runs converge on the
 * same patched files.
 */
export const withRockAutolinking: ConfigPlugin = (config) => {
  config = withRockIosPodfile(config);
  config = withRockIosXcode(config);
  config = withRockAndroid(config);
  return config;
};

export default withRockAutolinking;
