import { formatConfig } from '../bin.js';
import { PLATFORMS, PLUGINS } from '../templates.js';

test('formatConfig', () => {
  expect(formatConfig(PLATFORMS, PLUGINS)).toMatchInlineSnapshot(`
    "import { platformIOS } from '@rnef/platform-ios';
    import { platformAndroid } from '@rnef/platform-android';
    import { pluginMetro } from '@rnef/plugin-metro';
    import { pluginRepack } from '@rnef/plugin-repack';

    export default {
      plugins: [
        pluginMetro(),
        pluginRepack(),
      ],
      platforms: {
        ios: platformIOS(),
        android: platformAndroid(),
      },
    };
    "
  `);

  expect(formatConfig([PLATFORMS[0]], [PLUGINS[0]])).toMatchInlineSnapshot(`
    "import { platformIOS } from '@rnef/platform-ios';
    import { pluginMetro } from '@rnef/plugin-metro';

    export default {
      plugins: [
        pluginMetro(),
      ],
      platforms: {
        ios: platformIOS(),
      },
    };
    "
  `);
});
