import { pluginMetro } from '../lib/pluginMetro.js';
import { expect, test } from 'vitest';

const pluginApi = { registerCommand: vi.fn() };

test('plugin is called with correct arguments and returns its name and description', () => {
  const plugin = pluginMetro({
    root: '/',
    reactNativeVersion: '0.76.0',
    reactNativePath: '/path/to/react-native',
    platforms: {
      android: {},
    },
  })(pluginApi);

  expect(plugin).toMatchObject({
    name: 'plugin-metro',
    description: 'RNEF plugin for Metro bundler.',
  });
});
