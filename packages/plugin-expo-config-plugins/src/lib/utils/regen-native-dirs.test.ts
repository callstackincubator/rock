import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { PluginApi } from '@rock-js/config';
import { cleanup, getTempDirectory } from '@rock-js/test-helpers';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { regenNativeDirs } from './regen-native-dirs.js';

let tempDir = '';

function getApi(projectRoot: string): PluginApi {
  return {
    registerCommand: vi.fn(),
    getProjectRoot: () => projectRoot,
    getReactNativeVersion: vi.fn(),
    getReactNativePath: vi.fn(),
    getPlatforms: vi.fn(),
    getRemoteCacheProvider: vi.fn(),
    getFingerprintOptions: vi.fn(),
    getBundlerStart: vi.fn(),
    getUsePrebuiltRNCore: vi.fn(),
  };
}

async function setupTemplate(projectRoot: string) {
  const iosTemplateDir = path.join(
    projectRoot,
    'node_modules',
    '@rock-js',
    'platform-ios',
    'template',
    'ios',
    'HelloWorld.xcodeproj',
  );
  const androidTemplateDir = path.join(
    projectRoot,
    'node_modules',
    '@rock-js',
    'platform-android',
    'template',
    'android',
  );

  await fs.mkdir(iosTemplateDir, { recursive: true });
  await fs.mkdir(androidTemplateDir, { recursive: true });

  await fs.writeFile(
    path.join(iosTemplateDir, 'project.pbxproj'),
    'PRODUCT_NAME = HelloWorld;\nPRODUCT_BUNDLE_IDENTIFIER = "org.helloworld";\n',
    'utf-8',
  );
  await fs.writeFile(
    path.join(androidTemplateDir, 'settings.gradle'),
    'rootProject.name = "HelloWorld"\n',
    'utf-8',
  );
}

beforeEach(async () => {
  tempDir = getTempDirectory('mobile');
  await fs.mkdir(tempDir, { recursive: true });
  await setupTemplate(tempDir);
});

afterEach(() => {
  cleanup(tempDir);
});

describe('regenNativeDirs', () => {
  test('uses app.json name when replacing placeholders', async () => {
    await fs.writeFile(
      path.join(tempDir, 'app.json'),
      JSON.stringify({ expo: { name: 'test-app-name' } }),
      'utf-8',
    );

    await regenNativeDirs(getApi(tempDir));

    // Should use name defined in app.json
    await expect(
      fs.access(path.join(tempDir, 'ios', 'TestAppName.xcodeproj')),
    ).resolves.toBeUndefined();

    // Should not use parent directory name
    await expect(
      fs.access(path.join(tempDir, 'ios', 'mobile.xcodeproj')),
    ).rejects.toThrow();

    const pbxproj = await fs.readFile(
      path.join(tempDir, 'ios', 'TestAppName.xcodeproj', 'project.pbxproj'),
      'utf-8',
    );
    expect(pbxproj).toContain('PRODUCT_NAME = TestAppName;');
    expect(pbxproj).toContain('org.testappname');

    const androidSettings = await fs.readFile(
      path.join(tempDir, 'android', 'settings.gradle'),
      'utf-8',
    );
    expect(androidSettings).toContain('rootProject.name = "TestAppName"');
  });

  test('falls back to folder name when app.json is missing', async () => {
    await regenNativeDirs(getApi(tempDir));

    await expect(
      fs.access(path.join(tempDir, 'ios', 'mobile.xcodeproj')),
    ).resolves.toBeUndefined();
  });
});
