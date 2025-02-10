import type { PluginApi } from '@rnef/config';
import { modifyApk } from './modifyApk.js';

export type SignFlags = {
  verbose?: boolean;
  apk: string;
  output?: string;
  keystore?: string;
  keystorePassword?: string;
  buildJsbundle?: boolean;
  jsbundle?: string;
  noHermes?: boolean;
};

const ARGUMENTS = [
  {
    name: 'apk',
    description: 'APK file path',
  },
];

const OPTIONS = [
  {
    name: '--verbose',
    description: '',
  },
  {
    name: '--keystore <string>',
    description: 'Path to keystore file',
  },
  {
    name: '--keystore-password <string>',
    description: 'Password for keystore file',
  },
  {
    name: '--output <string>',
    description: 'Path to the output APK file.',
  },
  {
    name: '--build-jsbundle',
    description: 'Build the JS bundle before signing.',
  },
  {
    name: '--jsbundle <string>',
    description: 'Path to the JS bundle to apply before signing.',
  },
  {
    name: '--no-hermes',
    description: 'Do not use Hermes to build the JS bundle.',
  },
];

export const registerSignCommand = (api: PluginApi) => {
  api.registerCommand({
    name: 'sign:android',
    description: 'Sign the Android app',
    args: ARGUMENTS,
    options: OPTIONS,
    action: async (apkPath, flags: SignFlags) => {
      await modifyApk({
        apkPath,
        keystore: flags.keystore,
        keystorePassword: flags.keystorePassword,
        outputPath: flags.output,
        buildJsBundle: flags.buildJsbundle,
        jsBundlePath: flags.jsbundle,
        useHermes: !flags.noHermes,
      });
    },
  });
};
