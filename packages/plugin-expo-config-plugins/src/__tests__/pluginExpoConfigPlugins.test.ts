import { expect, test, beforeEach, afterEach } from 'vitest';
import { cleanup, getTempDirectory } from '@rnef/test-helpers';
import { pluginExpoConfigPlugins } from '../lib/pluginExpoConfigPlugins.js';
import path from 'node:path';
import * as fs from 'node:fs/promises';
import { withInternal } from '../lib/plugins/withInternal.js';
import { ProjectInfo } from '../lib/types.js';
import {
  evalModsAsync,
  IOSConfig,
  withDefaultBaseMods,
  withPlugins,
} from '@expo/config-plugins';

let TEMP_DIR: string;

const pluginApi = {
  registerCommand: vi.fn(),
  getProjectRoot: vi.fn(),
  getReactNativePath: vi.fn(),
  getReactNativeVersion: vi.fn(),
  getPlatforms: vi.fn(),
  getRemoteCacheProvider: vi.fn(),
  getFingerprintOptions: vi.fn(),
};

beforeEach(async () => {
  TEMP_DIR = getTempDirectory('expo-config-plugins-test-app');

  const testAppPath = path.join(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    'apps',
    'expo-config-plugins-test-app'
  );
  await fs.cp(testAppPath, TEMP_DIR, { recursive: true });

  pluginApi.getProjectRoot.mockReturnValue(TEMP_DIR);
});

afterEach(() => {
  if (TEMP_DIR) {
    cleanup(TEMP_DIR);
  }
});

async function getTestConfig() {
  const appJsonPath = path.join(pluginApi.getProjectRoot(), 'app.json');

  const content = await fs.readFile(appJsonPath, 'utf-8');
  const { expo, ...rest } = JSON.parse(content);
  const appJsonConfig = expo || rest;

  const info = {
    projectRoot: pluginApi.getProjectRoot(),
    platforms: ['ios'] as ProjectInfo['platforms'],
    packageJsonPath: path.join(pluginApi.getProjectRoot(), 'package.json'),
  };

  let config = withInternal(appJsonConfig, info);

  return { config, info };
}

test('plugin is called with correct arguments and returns its name and description', () => {
  const plugin = pluginExpoConfigPlugins()(pluginApi);

  expect(plugin).toMatchObject({
    name: 'plugin-expo-config-plugins',
    description: 'RNEF plugin for Expo Config Plugins.',
  });
});

describe('plugin applies default iOS config plugins correctly', () => {
  test('plugin applies withBundleIdentifier correctly', async () => {
    let { config, info } = await getTestConfig();

    const bundleIdentifier = config.scheme as string;
    if (!config.ios) config.ios = {};
    config.ios.bundleIdentifier = bundleIdentifier;

    config = withPlugins(config, [
      [IOSConfig.BundleIdentifier.withBundleIdentifier, { bundleIdentifier }],
    ]);

    config = withDefaultBaseMods(config);

    const projectPbxprojPath = `${TEMP_DIR}/ios/ExpoConfigPluginsTestApp.xcodeproj/project.pbxproj`;

    // Check the initial bundle identifier
    const projectContent = await fs.readFile(projectPbxprojPath, 'utf8');
    expect(projectContent).toContain(
      'PRODUCT_BUNDLE_IDENTIFIER = "org.reactjs.native.example'
    );

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check the changed bundle identifier
    const changedProjectContent = await fs.readFile(projectPbxprojPath, 'utf8');
    expect(changedProjectContent).toContain(
      `PRODUCT_BUNDLE_IDENTIFIER = "${bundleIdentifier}";`
    );
  });

  test.skip('plugin applies withGoogle correctly', async () => {
    let { config, info } = await getTestConfig();

    config = withPlugins(config, [IOSConfig.Google.withGoogle]);

    config = withDefaultBaseMods(config);

    // Check something

    // Apply the plugin
    await evalModsAsync(config, info);
  });
});
