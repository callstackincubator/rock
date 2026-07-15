import { platformIOS } from '@rock-js/platform-ios';
import { platformAndroid } from '@rock-js/platform-android';
import { pluginMetro } from '@rock-js/plugin-metro';
import { pluginExpoConfigPlugins } from '@rock-js/plugin-expo-config-plugins';

export default {
  plugins: [pluginExpoConfigPlugins()],
  bundler: pluginMetro(),
  platforms: {
    ios: platformIOS(),
    android: platformAndroid(),
  },
};
