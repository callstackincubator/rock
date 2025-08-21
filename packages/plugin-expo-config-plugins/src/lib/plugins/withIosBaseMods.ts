import { BaseMods } from '../ExpoConfigPlugins.js';
import { makeFilePathModifier, makeNullProvider } from '../provider.js';
import type { IosModFileProviders } from '../types.js';
import configPlugins from '@expo/config-plugins';

// @todo rewrite template finding and copying logic
const modifyFilePath = makeFilePathModifier('node_modules/../ios');

const nullProvider = makeNullProvider();

// https://github.com/expo/expo/blob/sdk-51/packages/%40expo/config-plugins/src/plugins/withIosBaseMods.ts
const expoProviders = BaseMods.getIosModFileProviders();

export function getIosModFileProviders(
  config: configPlugins.ExportedConfig
): IosModFileProviders {
  return {
    dangerous: expoProviders.dangerous,
    finalized: expoProviders.finalized,
    appDelegate: modifyFilePath(
      expoProviders.appDelegate,
      `${config.name}/AppDelegate.swift`
    ),
    // @ts-expect-error todo fix
    expoPlist: nullProvider,
    xcodeproj: modifyFilePath(
      expoProviders.xcodeproj,
      `${config.name}.xcodeproj/project.pbxproj`
    ),
    infoPlist: modifyFilePath(
      expoProviders.infoPlist,
      `${config.name}/Info.plist`
    ),
    // @ts-expect-error todo fix
    entitlements: nullProvider,
    // @ts-expect-error todo fix
    podfile: makeNullProvider({
      path: '',
      language: 'rb' as const,
      contents: '',
    }),
    podfileProperties: expoProviders.podfileProperties,
  };
}
