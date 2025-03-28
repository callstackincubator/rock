import { formatConfig } from '../bin.js';
import type { TemplateInfo } from '../templates.js';
import { BUNDLERS, PLATFORMS } from '../templates.js';

test('should format config without plugins', () => {
  expect(formatConfig(PLATFORMS, null, BUNDLERS[0], null))
    .toMatchInlineSnapshot(`
      "import { platformIOS } from '@rnef/platform-ios';
      import { platformAndroid } from '@rnef/platform-android';
      import { pluginMetro } from '@rnef/plugin-metro';

      export default {
        bundler: pluginMetro(),
        platforms: {
          ios: platformIOS(),
          android: platformAndroid(),
        },
        remoteCacheProvider: null,
      };
      "
    `);
});

test('should format config with plugins', () => {
  const plugins: TemplateInfo[] = [
    {
      type: 'npm',
      name: 'test',
      packageName: '@rnef/plugin-test',
      version: 'latest',
      directory: 'template',
      importName: 'pluginTest',
    },
  ];

  expect(formatConfig([PLATFORMS[0]], plugins, BUNDLERS[1], 'github-actions'))
    .toMatchInlineSnapshot(`
      "import { platformIOS } from '@rnef/platform-ios';
      import { pluginTest } from '@rnef/plugin-test';
      import { pluginRepack } from '@rnef/plugin-repack';

      export default {
        plugins: [
          pluginTest(),
        ],
        bundler: pluginRepack(),
        platforms: {
          ios: platformIOS(),
        },
        remoteCacheProvider: 'github-actions',
      };
      "
    `);
});
