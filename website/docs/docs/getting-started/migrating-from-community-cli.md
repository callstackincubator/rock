# Migrating from Community CLI

1. Install dev dependencies:

   ```sh
   npm install -D @rnef/cli @rnef/plugin-metro @rnef/platform-android @rnef/platform-ios
   ```

1. Remove `@react-native-community/cli` and related packages.

1. Add `.rnef/` folder with caches to `.gitignore`:

   ```txt title=".gitignore"
   .rnef/
   ```

1. Add `rnef.config.mjs` file:

   ```js title="rnef.config.mjs"
   import { platformIOS } from '@rnef/platform-ios';
   import { platformAndroid } from '@rnef/platform-android';
   import { pluginMetro } from '@rnef/plugin-metro';

   export default {
     bundler: pluginMetro(),
     platforms: {
       ios: platformIOS(),
       android: platformAndroid(),
     },
     remoteCacheProvider: 'github-actions',
   };
   ```

1. Update Android files:

   In `android/app/build.gradle` set the `cliFile` with the new path:

   ```groovy title="android/app/build.gradle" {2}
   // cliFile = file("../../node_modules/react-native/cli.js")
   cliFile = file("../../node_modules/@rnef/cli/src/bin.js")
   ```

   In `android/settings.gradle` change:

   ```groovy title="android/settings.gradle" {2}
   // extensions.configure(com.facebook.react.ReactSettingsExtension){ ex -> ex.autolinkLibrariesFromCommand() }
   extensions.configure(com.facebook.react.ReactSettingsExtension){ ex -> ex.autolinkLibrariesFromCommand(['npx', 'rnef', 'config', '-p', 'android']) }
   ```

1. Update iOS files:

   In `ios/Podfile` change:

   ```ruby title="ios/Podfile" {2}
   # config = use_native_modules!
   config = use_native_modules!(['npx', 'rnef', 'config', '-p', 'ios'])
   ```

   In "Bundle React Native code and images" Build Phase in Xcode add:

   ```shell title="Bundle React Native code and images build phase" {2-9}
   set -e
   if [[ -f "$PODS_ROOT/../.xcode.env" ]]; then
   source "$PODS_ROOT/../.xcode.env"
   fi
   if [[ -f "$PODS_ROOT/../.xcode.env.local" ]]; then
   source "$PODS_ROOT/../.xcode.env.local"
   fi
   export CONFIG_CMD="dummy-workaround-value"
   export CLI_PATH="$("$NODE_BINARY" --print "require('path').dirname(require.resolve('@rnef/cli/package.json')) + '/dist/src/bin.js'")"
   WITH_ENVIRONMENT="$REACT_NATIVE_PATH/scripts/xcode/with-environment.sh"
   ```

1. Cleanup native files:

   ```sh
   git clean -fdx ios/ android/
   ```

1. Run new commands:

   ```sh
   npx rnef run:android
   npx rnef run:ios
   ```

   Additionally rename flags:

   - `--mode` to `--variant` for Android commands
   - `--mode` to `--configuration` for iOS commands
   - `--buildFolder` to `--build-folder` for iOS commands
   - `--destination` to `--destinations` for iOS commands
   - `--appId` to `--app-id` for Android commands
   - `--appIdSuffix` to `--app-id-suffix` for Android commands

   And remove unsupported flags:

   - `--interactive`/`-i` – the CLI will prompt you for input where necessary
   - `--list-devices` - when no devices are connected, you'll be prompt with a full device selection

1. Configure GitHub Actions for remote builds in your workflow

   iOS:

   ```yaml title=".github/workflows/build-ios"
   - name: RNEF Remote Build - iOS simulator
     id: rnef-remote-build-ios
     uses: ./.github/actions/rnef-remote-build-ios
     with:
       destination: simulator
       configuration: Debug
   ```

   Android:

   ```yaml title=".github/workflows/build-android"
   - name: RNEF Remote Build - Android
     id: rnef-remote-build-android
     uses: ./.github/actions/rnef-remote-build-android
     with:
       variant: debug
   ```

   For more setup options see [GitHub Actions configuration](../remote-cache/github-actions/configuration.md)
