const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const settingsGradlePath = path.join(projectRoot, 'android', 'settings.gradle');
const appBuildGradlePath = path.join(
  projectRoot,
  'android',
  'app',
  'build.gradle',
);

const pluginManagementLine =
  'pluginManagement { includeBuild("../node_modules/@react-native/gradle-plugin") }';
const trailingIncludeLine =
  "includeBuild('../node_modules/@react-native/gradle-plugin')";

/**
 * Only required to satisfy the updated paths in the generated template.
 * This is due to pnpm's package resolution strategy.
 * 
 * React Native generates relative ../node_modules paths here, but that breaks with pnpm
 * because packages live under the pnpm store and are exposed via symlinks. We resolve
 * the installed react-native package first, then derive the Gradle plugin/codegen paths
 * from that real location so Android can find them reliably.
 */
const patchedContent = `pluginManagement {
    def reactNativePackageDir = providers.exec {
        commandLine("node", "--print", "require('path').dirname(require.resolve('react-native/package.json'))")
    }.standardOutput.asText.get().trim()
    includeBuild(new File(reactNativePackageDir, "../@react-native/gradle-plugin").canonicalPath)
}
plugins { id("com.facebook.react.settings") }
def reactNativePackageDir = providers.exec {
    commandLine("node", "--print", "require('path').dirname(require.resolve('react-native/package.json'))")
}.standardOutput.asText.get().trim()
def reactNativeGradlePluginDir = new File(reactNativePackageDir, "../@react-native/gradle-plugin").canonicalPath
extensions.configure(com.facebook.react.ReactSettingsExtension){ ex -> ex.autolinkLibrariesFromCommand(['npx', 'rock', 'config', '-p', 'android']) }
rootProject.name = 'ExpoConfigPluginsTestApp'
include ':app'
includeBuild(reactNativeGradlePluginDir)
`;

const reactBlockNeedle = `react {
    /* Folders */
    //   The root of your project, i.e. where "package.json" lives. Default is '../..'
    // root = file("../../")
    //   The folder where the react-native NPM package is. Default is ../../node_modules/react-native
    // reactNativeDir = file("../../node_modules/react-native")
    //   The folder where the react-native Codegen package is. Default is ../../node_modules/@react-native/codegen
    // codegenDir = file("../../node_modules/@react-native/codegen")
    //   The cli.js file which is the React Native CLI entrypoint. Default is ../../node_modules/react-native/cli.js
    cliFile = file("../../node_modules/rock/dist/src/bin.js")
`;

const patchedReactBlock = `def reactNativePackageDir = providers.exec {
    commandLine("node", "--print", "require('path').dirname(require.resolve('react-native/package.json'))")
}.standardOutput.asText.get().trim()
def reactNativeCodegenDir = new File(reactNativePackageDir, "../@react-native/codegen").canonicalPath

react {
    reactNativeDir = file(reactNativePackageDir)
    codegenDir = file(reactNativeCodegenDir)

    /* Folders */
    //   The root of your project, i.e. where "package.json" lives. Default is '../..'
    // root = file("../../")
    //   The folder where the react-native NPM package is. Default is ../../node_modules/react-native
    // reactNativeDir = file("../../node_modules/react-native")
    //   The folder where the react-native Codegen package is. Default is ../../node_modules/@react-native/codegen
    // codegenDir = file("../../node_modules/@react-native/codegen")
    //   The cli.js file which is the React Native CLI entrypoint. Default is ../../node_modules/react-native/cli.js
    cliFile = file("../../node_modules/rock/dist/src/bin.js")
`;

if (!fs.existsSync(settingsGradlePath)) {
  throw new Error(`Missing android/settings.gradle at ${settingsGradlePath}`);
}
if (!fs.existsSync(appBuildGradlePath)) {
  throw new Error(`Missing android/app/build.gradle at ${appBuildGradlePath}`);
}

const original = fs.readFileSync(settingsGradlePath, 'utf8');

if (original === patchedContent) {
  console.log('settings.gradle already patched');
  process.exit(0);
}

if (
  !original.includes(pluginManagementLine) ||
  !original.includes(trailingIncludeLine) ||
  !original.includes(
    "extensions.configure(com.facebook.react.ReactSettingsExtension){ ex -> ex.autolinkLibrariesFromCommand(['npx', 'rock', 'config', '-p', 'android']) }",
  ) ||
  !original.includes("rootProject.name = 'ExpoConfigPluginsTestApp'") ||
  !original.includes("include ':app'")
) {
  throw new Error(
    'android/settings.gradle does not match the expected generated template',
  );
}

fs.writeFileSync(settingsGradlePath, patchedContent);
console.log('Patched android/settings.gradle');

const originalAppBuildGradle = fs.readFileSync(appBuildGradlePath, 'utf8');

if (!originalAppBuildGradle.includes('def reactNativeCodegenDir =')) {
  if (!originalAppBuildGradle.includes(reactBlockNeedle)) {
    throw new Error(
      'android/app/build.gradle does not match the expected generated template',
    );
  }

  const patchedAppBuildGradle = originalAppBuildGradle.replace(
    reactBlockNeedle,
    patchedReactBlock,
  );

  fs.writeFileSync(appBuildGradlePath, patchedAppBuildGradle);
  console.log('Patched android/app/build.gradle');
} else {
  console.log('app/build.gradle already patched');
}
