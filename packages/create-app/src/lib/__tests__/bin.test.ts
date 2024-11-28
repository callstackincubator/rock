import { formatConfig } from '../bin.js';
import { PLATFORMS, PLUGINS } from '../templates.js';

test('formatConfig', () => {
  expect(formatConfig(PLATFORMS, PLUGINS)).toMatchInlineSnapshot(`
    "import { pluginPlatformIOS } from '@callstack/rnef-plugin-platform-ios';
    import { pluginPlatformAndroid } from '@callstack/rnef-plugin-platform-android';
    import { pluginMetro } from '@callstack/rnef-plugin-metro';
    import { pluginRepack } from '@callstack/rnef-plugin-repack';

    export default {
      plugins: {
        metro: pluginMetro(),
        repack: pluginRepack(),
      },
      platforms: {
        ios: pluginPlatformIOS(),
        android: pluginPlatformAndroid(),
      },
    };
    "
  `);

  expect(formatConfig([PLATFORMS[0]], [PLUGINS[0]])).toMatchInlineSnapshot(`
    "import { pluginPlatformIOS } from '@callstack/rnef-plugin-platform-ios';
    import { pluginMetro } from '@callstack/rnef-plugin-metro';

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
