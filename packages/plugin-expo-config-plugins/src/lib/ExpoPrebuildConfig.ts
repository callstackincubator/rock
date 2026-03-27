import fs from 'node:fs/promises';
import path from 'node:path';
import type { ConfigPlugin } from '@expo/config-plugins';
import ExpoConfigPlugins from '@expo/config-plugins';
// '@expo/prebuild-config' is a CommonJS module, which may not support all
// module.exports as named exports. CommonJS modules can always be imported via
// the default export.
import { withAndroidIcons as expoWithAndroidIcons } from '@expo/prebuild-config/build/plugins/icons/withAndroidIcons.js';
import { withIosIcons } from '@expo/prebuild-config/build/plugins/icons/withIosIcons.js';

const { withDangerousMod } = ExpoConfigPlugins;

const ANDROID_ICON_DIRECTORIES = [
  'mipmap-mdpi',
  'mipmap-hdpi',
  'mipmap-xhdpi',
  'mipmap-xxhdpi',
  'mipmap-xxxhdpi',
];

const ANDROID_TEMPLATE_ICON_FILES = [
  'ic_launcher.png',
  'ic_launcher_round.png',
];

export const withAndroidIcons: ConfigPlugin = (config) => {
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const resDir = path.join(
        config.modRequest.projectRoot,
        'android',
        'app',
        'src',
        'main',
        'res',
      );

      // Remove existing icons from the Rock template when applying from CNG, so we don't get duplicate assets
      await Promise.all(
        ANDROID_ICON_DIRECTORIES.flatMap((directory) =>
          ANDROID_TEMPLATE_ICON_FILES.map((file) =>
            fs.rm(path.join(resDir, directory, file), { force: true }),
          ),
        ),
      );

      return config;
    },
  ]);

  return expoWithAndroidIcons(config);
};

export { withIosIcons };
