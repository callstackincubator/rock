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
import * as plist from 'plist';

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
  const iosDirPath = path.join(pluginApi.getProjectRoot(), 'ios');

  const [appJsonContent, iosDirContent] = await Promise.all([
    fs.readFile(appJsonPath, 'utf-8'),
    fs.readdir(iosDirPath),
  ]);

  const { expo, ...rest } = JSON.parse(appJsonContent);
  const appJsonConfig = expo || rest;

  const iosProjectName =
    iosDirContent.find((dir) => dir.includes('.xcodeproj'))?.split('.')[0] ??
    '';

  const info = {
    projectRoot: pluginApi.getProjectRoot(),
    platforms: ['ios'] as ProjectInfo['platforms'],
    packageJsonPath: path.join(pluginApi.getProjectRoot(), 'package.json'),
    appJsonPath,
    iosProjectName,
  };

  let config = withInternal(appJsonConfig, info);

  return { config, info };
}

async function parsePlistForKey(path: string, key: string) {
  const infoPlistContent = await fs.readFile(path, 'utf8');
  const parsed = plist.parse(infoPlistContent) as Record<
    string,
    plist.PlistValue
  >;

  console.log('parsed', parsed);

  return parsed[key];
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

    const bundleIdentifier = 'dev.rockjs.test';
    if (!config.ios) config.ios = {};
    config.ios.bundleIdentifier = bundleIdentifier;

    config = withPlugins(config, [
      [IOSConfig.BundleIdentifier.withBundleIdentifier, { bundleIdentifier }],
    ]);

    config = withDefaultBaseMods(config);

    const projectPbxprojPath = `${TEMP_DIR}/ios/${info.iosProjectName}.xcodeproj/project.pbxproj`;

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

  test('plugin applies withDisplayName correctly', async () => {
    let { config, info } = await getTestConfig();

    // Edit the display name
    config.name = 'TestAppEditedName';

    config = withPlugins(config, [IOSConfig.Name.withDisplayName]);
    config = withDefaultBaseMods(config);

    const infoPlistPath = `${TEMP_DIR}/ios/${info.iosProjectName}/Info.plist`;

    // Check initial state
    const initialDisplayName = await parsePlistForKey(
      infoPlistPath,
      'CFBundleDisplayName'
    );

    expect(initialDisplayName).toBe(info.iosProjectName);

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that display name was updated
    const changedDisplayName = await parsePlistForKey(
      infoPlistPath,
      'CFBundleDisplayName'
    );

    expect(changedDisplayName).toBe(config.name);
  });

  test('plugin applies withProductName correctly', async () => {
    let { config, info } = await getTestConfig();

    // Edit the product name
    config.name = 'TestProductName';

    config = withPlugins(config, [IOSConfig.Name.withProductName]);

    config = withDefaultBaseMods(config);

    const projectPbxprojPath = `${TEMP_DIR}/ios/${info.iosProjectName}.xcodeproj/project.pbxproj`;

    // Check initial state
    const projectContent = await fs.readFile(projectPbxprojPath, 'utf8');
    expect(projectContent).toContain(`PRODUCT_NAME = ${info.iosProjectName}`);

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that product name was updated
    const changedProjectContent = await fs.readFile(projectPbxprojPath, 'utf8');
    expect(changedProjectContent).toContain(`PRODUCT_NAME = "${config.name}"`);
  });

  test('plugin applies withOrientation correctly', async () => {
    let { config, info } = await getTestConfig();

    // Add orientation configuration to the config
    config.orientation = 'landscape';

    config = withPlugins(config, [IOSConfig.Orientation.withOrientation]);

    config = withDefaultBaseMods(config);

    const infoPlistPath = `${TEMP_DIR}/ios/${info.iosProjectName}/Info.plist`;

    const initialOrientation = await parsePlistForKey(
      infoPlistPath,
      'UISupportedInterfaceOrientations'
    );

    expect(initialOrientation).toContain('UIInterfaceOrientationPortrait');
    expect(initialOrientation).toContain('UIInterfaceOrientationLandscapeLeft');
    expect(initialOrientation).toContain(
      'UIInterfaceOrientationLandscapeRight'
    );

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that orientation was updated
    const changedOrientation = await parsePlistForKey(
      infoPlistPath,
      'UISupportedInterfaceOrientations'
    );

    expect(changedOrientation).not.toContain('UIInterfaceOrientationPortrait');
    expect(changedOrientation).toContain('UIInterfaceOrientationLandscapeLeft');
    expect(changedOrientation).toContain(
      'UIInterfaceOrientationLandscapeRight'
    );
  });

  test('plugin applies withRequiresFullScreen correctly', async () => {
    let { config, info } = await getTestConfig();

    // Add requires full screen configuration to the config
    if (!config.ios) config.ios = {};
    config.ios.requireFullScreen = true;

    config = withPlugins(config, [
      IOSConfig.RequiresFullScreen.withRequiresFullScreen,
    ]);

    config = withDefaultBaseMods(config);

    const infoPlistPath = `${TEMP_DIR}/ios/${info.iosProjectName}/Info.plist`;

    // Check initial state
    const initialRequiresFullScreen = await parsePlistForKey(
      infoPlistPath,
      'UIRequiresFullScreen'
    );

    expect(initialRequiresFullScreen).toBeUndefined();

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that requires full screen was added
    const changedRequiresFullScreen = await parsePlistForKey(
      infoPlistPath,
      'UIRequiresFullScreen'
    );
    expect(changedRequiresFullScreen).toBe(true);
  });

  test('plugin applies withScheme correctly', async () => {
    let { config, info } = await getTestConfig();

    // Add scheme to the config
    config.scheme = 'dev.rockjs.test';

    config = withPlugins(config, [IOSConfig.Scheme.withScheme]);

    config = withDefaultBaseMods(config);

    const infoPlistPath = `${TEMP_DIR}/ios/${info.iosProjectName}/Info.plist`;

    // Check initial state
    const initialScheme = await parsePlistForKey(
      infoPlistPath,
      'CFBundleURLTypes'
    );

    expect(initialScheme).toBeUndefined();

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that scheme was added
    const urlTypes = (await parsePlistForKey(
      infoPlistPath,
      'CFBundleURLTypes'
    )) as plist.PlistObject[];

    const changedScheme = urlTypes[0]['CFBundleURLSchemes'];

    expect(changedScheme).toContain(config.scheme);
  });
});
