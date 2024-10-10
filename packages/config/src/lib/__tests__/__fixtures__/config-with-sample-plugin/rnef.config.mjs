import { TestPlugin } from './SamplePlugin.mjs';
import { PluginPlatformAndroid } from './PluginPlatformAndroid.mjs';

export default {
  plugins: {
    'test-plugin': TestPlugin(),
  },
  platforms: {
    android: PluginPlatformAndroid(),
  },
};
