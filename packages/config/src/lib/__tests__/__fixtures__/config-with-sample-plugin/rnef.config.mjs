import { TestPlugin } from './SamplePlugin.mjs';
import { PluginPlatformAndroid } from './PluginPlatformAndroid.mjs';

export default {
  plugins: [TestPlugin()],
  platforms: {
    android: PluginPlatformAndroid(),
  },
};
