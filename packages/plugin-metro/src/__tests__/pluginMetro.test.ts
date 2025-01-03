import { expect, test } from 'vitest';
import { pluginMetro } from '../lib/pluginMetro.js';

const pluginApi = {
  registerCommand: vi.fn(),
  getProjectRoot: vi.fn(),
  getReactNativePath: vi.fn(),
  getReactNativeVersion: vi.fn(),
  getPlatforms: vi.fn(),
};

test('plugin is called with correct arguments and returns its name and description', () => {
  const plugin = pluginMetro()(pluginApi);

  expect(plugin).toMatchObject({
    name: 'plugin-metro',
    description: 'RNEF plugin for Metro bundler.',
  });
});
