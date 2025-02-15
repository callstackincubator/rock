import type { PluginApi } from '@rnef/config';
import { modifyIpa } from '@rnef/plugin-platform-apple';

export type SignFlags = {
  verbose?: boolean;
  ipa: string;
  output?: string;
  identity?: string;
  buildJsbundle?: boolean;
  jsbundle?: string;
  noHermes?: boolean;
};

const ARGUMENTS = [
  {
    name: 'ipa',
    description: 'IPA file path',
  },
];

const OPTIONS = [
  {
    name: '--verbose',
    description: '',
  },
  {
    name: '--identity <string>',
    description: 'Identity to use for code signing.',
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
    description: 'Sign the iOS app',
    args: ARGUMENTS,
    options: OPTIONS,
    action: async (ipaPath, flags: SignFlags) => {
      await modifyIpa({
        platformName: 'ios',
        ipaPath,
        identity: flags.identity,
        outputPath: flags.output,
        buildJsBundle: flags.buildJsbundle,
        jsBundlePath: flags.jsbundle,
        useHermes: !flags.noHermes,
      });
    },
  });
};
