import { formatConfig } from '../bin.js';
import { PLATFORMS, PLUGINS } from '../templates.js';

test('formatConfig', () => {
  expect(formatConfig(PLATFORMS, PLUGINS)).toMatchInlineSnapshot(`
    "import { pluginPlatformIOS } from '@rnef/plugin-platform-ios';
    import { pluginPlatformVisionOS } from '@rnef/plugin-platform-visionos';
    import { pluginPlatformAndroid } from '@rnef/plugin-platform-android';
    import { pluginMetro } from '@rnef/plugin-metro';
    import { pluginRepack } from '@rnef/plugin-repack';

    export default {
      plugins: {
        metro: pluginMetro(),
        repack: pluginRepack(),
      },
      platforms: {
        ios: pluginPlatformIOS(),
        visionos: pluginPlatformVisionOS(),
        android: pluginPlatformAndroid(),
      },
    };
    "
  `);

  expect(formatConfig([PLATFORMS[0]], [PLUGINS[0]])).toMatchInlineSnapshot(`
    "import { pluginPlatformIOS } from '@rnef/plugin-platform-ios';
    import { pluginMetro } from '@rnef/plugin-metro';

    export default {
      plugins: {
        metro: pluginMetro(),
      },
      platforms: {
        ios: pluginPlatformIOS(),
      },
    };
    "
  `);
});
