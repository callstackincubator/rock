# Troubleshooting

## Monorepo + pnpm: Android Gradle paths

If your app lives in a monorepo and you install dependencies with pnpm, `node_modules` is usually at the workspace root. Update the Android Gradle files to point to the workspace root by replacing `../node_modules` with `{path_to_root}/node_modules` in:

- `android/settings.gradle`
- `android/app/build.gradle`

For example:

```groovy title="android/settings.gradle"
pluginManagement { includeBuild("../../node_modules/@react-native/gradle-plugin") }
// ...
includeBuild('../../node_modules/@react-native/gradle-plugin')
```

```groovy title="android/app/build.gradle"
// Replace ../node_modules with ../../node_modules wherever it appears
```

## Expo Config Plugins: reapply the patch on every prebuild

If you use `@rock-js/plugin-expo-config-plugins`, prebuild regenerates the native projects, so you must reapply the Gradle path patch after each prebuild.

- Create a small script to patch both files
- Then run it after every prebuild:

```json title="package.json"
{
  "scripts": {
    "prebuild": "rock prebuild && node ./scripts/patch-gradle-paths.js"
  }
}
```
