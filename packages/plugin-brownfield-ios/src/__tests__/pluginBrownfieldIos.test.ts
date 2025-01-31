import { expect, test } from 'vitest';
import { pluginBrownfieldIos } from '../lib/pluginBrownfieldIos.js';

const pluginApi = {
  registerCommand: vi.fn(),
  getProjectRoot: vi.fn(),
  getReactNativePath: vi.fn(),
  getReactNativeVersion: vi.fn(),
  getPlatforms: vi.fn(),
};

test('plugin is called with correct arguments and returns its name and description', () => {
  const plugin = pluginBrownfieldIos()(pluginApi);

  expect(plugin).toMatchObject({
    name: 'plugin-brownfield-ios',
    description: 'RNEF plugin for brownfield iOS.',
  });
});
