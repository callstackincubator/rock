import type { PluginApi } from '@rnef/config';
import { signIpaFile } from '@rnef/plugin-platform-apple';
import { RnefError } from '@rnef/tools';

export type SignFlags = {
  verbose?: boolean;
  //interactive?: boolean;
  ipa: string;
  output?: string;
  identity?: string;
  buildJsBundle?: boolean;
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
  // {
  //   name: '-i --interactive',
  //   description:
  //     'Explicitly select options for signing: ipa, identity, jsbundle',
  // },
  {
    name: '--output <string>',
    description: 'Path to the output IPA file.',
  },
  {
    name: '--identity <string>',
    description: 'Identity to use for code signing.',
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
    action: async (ipaPath, args) => {
      validateSignArgs(args);

      await signIpaFile({
        platformName: 'ios',
        ipaPath,
        identity: args.identity,
        outputPath: args.output,
        buildJsBundle: args.buildJsBundle,
        jsBundlePath: args.jsbundle,
        useHermes: !args.noHermes,
      });
    },
  });
};

export function validateSignArgs(args: unknown): asserts args is SignFlags {
  if (!args || typeof args !== 'object') {
    throw new RnefError('args must be an object');
  }

  if ('output' in args && typeof args.output !== 'string') {
    throw new RnefError('--output must be a string');
  }
}
