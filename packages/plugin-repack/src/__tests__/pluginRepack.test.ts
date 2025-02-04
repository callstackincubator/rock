import { expect, test } from 'vitest';
import { pluginRepack } from '../lib/pluginRepack.js';

const pluginApi = { registerCommand: vi.fn(), getProjectRoot: vi.fn() };

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
