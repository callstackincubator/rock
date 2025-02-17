import { TestPlugin } from './SamplePlugin.mjs';
import { PlatformAndroid } from './PlatformAndroid.mjs';

export default {
  plugins: [TestPlugin()],
  platforms: {
    android: PlatformAndroid(),
  },
};
