import { platformIOS } from '@rnef/platform-ios';
import { platformAndroid } from '@rnef/platform-android';
import { pluginMetro } from '@rnef/plugin-metro';
import { pluginExpoConfigPlugins } from '@rnef/plugin-expo-config-plugins';

export default {
  plugins: [pluginExpoConfigPlugins()],
  bundler: pluginMetro(),
  platforms: {
    ios: platformIOS(),
    android: platformAndroid(),
  },
  remoteCacheProvider: null,
};
