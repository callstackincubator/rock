import type * as PlatformAndroid from '@rock-js/platform-android';
import { packageAar, publishLocalAar } from '@rock-js/platform-android';
import { expect, test } from 'vitest';
import { pluginBrownfieldAndroid } from '../lib/pluginBrownfieldAndroid.js';

vi.mock('@react-native-community/cli-config-android', () => ({
  projectConfig: vi.fn(() => ({ sourceDir: '/android' })),
}));

vi.mock('@rock-js/platform-android', async (importOriginal) => ({
  ...(await importOriginal<typeof PlatformAndroid>()),
  packageAar: vi.fn(),
  publishLocalAar: vi.fn(),
}));

const pluginApi = {
  registerCommand: vi.fn(),
  getProjectRoot: vi.fn(),
  getReactNativePath: vi.fn(),
  getReactNativeVersion: vi.fn(),
  getPlatforms: vi.fn(),
};

function registeredAction(name: string) {
  const command = pluginApi.registerCommand.mock.calls.find(
    ([options]) => options.name === name,
  );
  return command?.[0].action;
}

test('plugin is called with correct arguments and returns its name and description', () => {
  const plugin = pluginBrownfieldAndroid()(pluginApi);

  expect(plugin).toMatchObject({
    name: 'plugin-brownfield-android',
    description: 'Rock plugin for brownfield Android.',
  });
});

test('package:aar and publish-local:aar pass extra params to Gradle', async () => {
  pluginBrownfieldAndroid()(pluginApi);
  const aarProject = { sourceDir: '/android', moduleName: 'reactnativeapp' };

  await registeredAction('package:aar')({
    variant: 'Release',
    moduleName: 'reactnativeapp',
    extraParams: ['-PmyProperty=value'],
  });
  await registeredAction('publish-local:aar')({
    moduleName: 'reactnativeapp',
    extraParams: ['-PmyProperty=value'],
  });

  expect(packageAar).toBeCalledWith(aarProject, 'Release', [
    '-PmyProperty=value',
  ]);
  expect(publishLocalAar).toBeCalledWith(aarProject, ['-PmyProperty=value']);
});
