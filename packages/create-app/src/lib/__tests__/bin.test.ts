import { formatConfig } from '../bin.js';
import { PLATFORMS } from '../templates.js';

test('formatConfig', () => {
  expect(formatConfig(PLATFORMS)).toMatchInlineSnapshot(`
        "import { pluginPlatformIOS } from '@callstack/rnef-plugin-platform-ios';
        import { pluginPlatformAndroid } from '@callstack/rnef-plugin-platform-android';
    
        export default {
          plugins: {},
          platforms: {
            ios: pluginPlatformIOS(),
            android: pluginPlatformAndroid(),
          },
        };
        "
      `);

  expect(formatConfig([PLATFORMS[0]])).toMatchInlineSnapshot(`
    "import { pluginPlatformIOS } from '@callstack/rnef-plugin-platform-ios';

    export default {
      plugins: {},
      platforms: {
        ios: pluginPlatformIOS(),
      },
    };
    "
  `);
});
