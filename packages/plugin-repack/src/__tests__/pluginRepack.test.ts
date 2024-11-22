import { pluginRepack } from '../lib/pluginRepack.js';
import { expect, test } from 'vitest';

const pluginApi = { registerCommand: vi.fn() };

test('plugin is called with correct arguments and returns its name and description', () => {
  const plugin = pluginRepack({
    root: '/',
    reactNativePath: '/path/to/react-native',
    platforms: {
      android: {},
    },
  })(pluginApi);

  expect(plugin).toMatchObject({
    name: 'plugin-repack',
    description: 'RNEF plugin for Re.Pack toolkit with Rspack.',
  });
});
