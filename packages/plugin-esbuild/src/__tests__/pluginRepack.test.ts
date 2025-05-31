import { expect, test } from 'vitest';
import { pluginRepack } from '../lib/pluginEsbuild.js';

const pluginApi = {
  registerCommand: vi.fn(),
  getProjectRoot: vi.fn(),
  getReactNativePath: vi.fn(),
  getReactNativeVersion: vi.fn(),
  getPlatforms: vi.fn(),
  getRemoteCacheProvider: vi.fn(),
};


test('plugin is called with correct arguments and returns its name and description', () => {
  const plugin = pluginRepack({
    platforms: {
      android: {},
    },
  })(pluginApi);

  expect(plugin).toMatchObject({
    name: '@rnef/plugin-esbuild',
    description: 'RNEF plugin for Re.Pack toolkit with Rspack.',
  });
});
