import type { PluginApi } from '@rnef/config';
import { modifyApp, modifyIpa } from '@rnef/platform-apple-helpers';

export type SignFlags = {
  app: string;
  output?: string;
  identity?: string;
  buildJsbundle?: boolean;
  jsbundle?: string;
  noHermes?: boolean;
};

const ARGUMENTS = [
  {
    name: 'binaryPath',
    description: 'Path to the IPA or APP file.',
  },
];

const OPTIONS = [
  {
    name: '--app',
    description: 'Modify APP file (directory) instead of IPA file. No signing is done.',
  },
  {
    name: '--identity <string>',
    description:
      'Certificate Identity name to use for code signing, e.g. "Apple Distribution: Your Team (HFJASKHDDS)".',
  },
  {
    name: '--output <string>',
    description: 'Path to the output IPA file.',
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
    name: 'sign:ios',
    description: 'Sign the iOS app (IPA or APP file) with modified JS bundle.',
    args: ARGUMENTS,
    options: OPTIONS,
    action: async (binaryPath, flags: SignFlags) => {
      if (flags.app) {
        await modifyApp({
          appPath: binaryPath,
          outputPath: flags.output,
          buildJsBundle: flags.buildJsbundle,
          jsBundlePath: flags.jsbundle,
          useHermes: !flags.noHermes,
        });
      } else {
        await modifyIpa({
          platformName: 'ios',
          ipaPath: binaryPath,
          identity: flags.identity,
          outputPath: flags.output,
          buildJsBundle: flags.buildJsbundle,
          jsBundlePath: flags.jsbundle,
          useHermes: !flags.noHermes,
        });
      }
    },
  });
};
