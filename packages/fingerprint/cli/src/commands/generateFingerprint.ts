import chalk from 'chalk';
import { boolish } from 'getenv';

import { Options, createFingerprintAsync } from '../../../build/index.js';
import { Command } from '../cli.js';
import { assertArgs, getProjectRoot } from '../utils/args.js';
import { CommandError } from '../utils/errors.js';
import * as Log from '../utils/log.js';
import { withConsoleDisabledAsync } from '../utils/withConsoleDisabledAsync.js';

export const generateFingerprintAsync: Command = async (argv) => {
  const args = assertArgs(
    {
      // Types
      '--help': Boolean,
      '--platform': String,
      '--debug': Boolean,
      // Aliases
      '-h': '--help',
    },
    argv ?? []
  );

  if (args['--help']) {
    Log.exit(
      chalk`
{bold Description}
Generate fingerprint for a project

{bold Usage}
  {dim $} npx @expo/fingerprint fingerprint:generate

  Options
  --platform <string>                  Platform to generate a fingerprint for
  --debug                              Whether to include verbose debug information in output
  -h, --help                           Output usage information
    `,
      0
    );
  }

  const platform = args['--platform'];
  if (platform && !['ios', 'android'].includes(platform)) {
    throw new CommandError(`Invalid platform argument: ${platform}`);
  }

  const options: Options = {
    debug: !!process.env.DEBUG || args['--debug'],
    useRNCoreAutolinkingFromExpo: process.env[
      'USE_RNCORE_AUTOLINKING_FROM_EXPO'
    ]
      ? boolish('USE_RNCORE_AUTOLINKING_FROM_EXPO')
      : undefined,
    ...(platform ? { platforms: [platform] } : null),
    silent: true,
  };

  const projectRoot = getProjectRoot(args);

  const result = await withConsoleDisabledAsync(async () => {
    try {
      return await createFingerprintAsync(projectRoot, options);
    } catch (e: any) {
      throw new CommandError(e.message);
    }
  });

  console.log(JSON.stringify(result));
};
