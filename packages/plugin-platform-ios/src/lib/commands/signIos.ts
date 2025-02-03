import type { PluginApi } from '@rnef/config';
import { signIpaFile } from '@rnef/plugin-platform-apple';
import { RnefError } from '@rnef/tools';

export type SignFlags = {
  verbose?: boolean;
  interactive?: boolean;
  ipa: string;
  output?: string;
  identity: string;
  jsbundle?: string;
};

export const registerSignCommand = (api: PluginApi) => {
  api.registerCommand({
    name: 'sign:ios',
    description: 'Sign the iOS app',
    options: getSignOptions(),
    action: async (args) => {
      validateSignArgs(args);
      await signIpaFile({
        platformName: 'ios',
        ipaPath: args.ipa,
        identity: args.identity,
        outputPath: args.output,
      });
    },
  });
};

export function validateSignArgs(args: unknown): asserts args is SignFlags {
  if (!args || typeof args !== 'object') {
    throw new RnefError('args must be an object');
  }

  if (!('ipa' in args) || !args.ipa) {
    throw new RnefError('--ipa is required');
  }

  if (!('identity' in args) || !args.identity) {
    throw new RnefError('--identity is required');
  }

  if ('output' in args && typeof args.output !== 'string') {
    throw new RnefError('--output must be a string');
  }
}

export const getSignOptions = () => {
  return [
    {
      name: '--verbose',
      description: '',
    },
    {
      name: '-i --interactive',
      description:
        'Explicitly select options for signing: ipa, identity, jsbundle',
    },
    {
      name: '--ipa <string>',
      description: 'Path to the IPA file to (re-)sign.',
    },
    {
      name: '--output <string>',
      description: 'Path to the output IPA file.',
    },
    {
      name: '--identity <string>',
      description: 'Identity to use for code signing.',
    },
    {
      name: '--jsbundle <string>',
      description: 'Path to the JS bundle to use before signing.',
    },
  ];
};
