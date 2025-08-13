import { expect, test } from 'vitest';
import { pluginBrownfieldAndroid } from '../lib/pluginBrownfieldAndroid.js';

const pluginApi = {
  registerCommand: vi.fn(),
  getProjectRoot: vi.fn(),
  getReactNativePath: vi.fn(),
  getReactNativeVersion: vi.fn(),
  getPlatforms: vi.fn(),
};

test('plugin is called with correct arguments and returns its name and description', () => {
  const plugin = pluginBrownfieldAndroid()(pluginApi);

  expect(plugin).toMatchObject({
    name: 'plugin-brownfield-android',
    description: 'Rock plugin for brownfield Android.',
  });
});
