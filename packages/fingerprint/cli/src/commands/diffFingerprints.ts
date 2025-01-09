import chalk from 'chalk';

import { diffFingerprints } from '../../../build/index.js';
import { Command } from '../cli.js';
import { assertArgs, getFileArgumentAtIndex } from '../utils/args.js';
import { CommandError } from '../utils/errors.js';
import * as Log from '../utils/log.js';
import readFingerprintFileAsync from '../utils/readFingerprintFileAsync.js';

export const diffFingerprintsAsync: Command = async (argv) => {
  const args = assertArgs(
    {
      // Types
      '--help': Boolean,
      // Aliases
      '-h': '--help',
    },
    argv ?? []
  );

  if (args['--help']) {
    Log.exit(
      chalk`
{bold Description}
Diff two fingerprints

{bold Usage}
  {dim $} npx @expo/fingerprint fingerprint:diff <fingerprintFile1> <fingerprintFile2>

  Options
  -h, --help                           Output usage information
    `,
      0
    );
  }

  const fingerprintFile1 = getFileArgumentAtIndex(args, 0);
  const fingerprintFile2 = getFileArgumentAtIndex(args, 1);

  const [fingeprint1ToDiff, fingerprint2ToDiff] = await Promise.all([
    readFingerprintFileAsync(fingerprintFile1),
    readFingerprintFileAsync(fingerprintFile2),
  ]);
  try {
    const diff = diffFingerprints(fingeprint1ToDiff, fingerprint2ToDiff);
    console.log(JSON.stringify(diff, null, 2));
  } catch (e: any) {
    throw new CommandError(e.message);
  }
};
