import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getConfig } from '@rnef/config';
import { logger, resolveFilenameUp, RnefError } from '@rnef/tools';
import { Command } from 'commander';
import { logConfig } from '../config.js';
import { nativeFingerprintCommand } from './commands/fingerprint.js';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const { version } = require(resolveFilenameUp(__dirname, 'package.json'));

type CliOptions = {
  cwd?: string;
  argv?: string[];
};

export const cli = async ({ cwd, argv }: CliOptions = {}) => {
  if (argv) {
    logger.setVerbose(argv.includes('--verbose'));
  }

  const program = new Command();

  program
    .name('rnef')
    .description('React Native Enterprise Framework CLI.')
    .option('--verbose', 'enable verbose logging')
    .version(version);

  program
    .command('config')
    .option('-p, --platform <string>', 'Select platform, e.g. ios or android')
    .action(logConfig);

  program
    .command('fingerprint [path]')
    .option('-p, --platform <string>', 'Select platform, e.g. ios or android')
    .action(nativeFingerprintCommand);

  // Register commands from the config
  const config = await getConfig(cwd);
  config.commands?.forEach((command) => {
    const cmd = program
      .command(command.name)
      .description(command.description || '')
      .action(async (args) => {
        try {
          await command.action(args);
        } catch (error) {
          if (!logger.isVerbose() && error instanceof RnefError) {
            logger.error(error.message);
            if (error.cause) {
              logger.error(`Cause: ${error.cause}`);
            }
          } else {
            logger.error(
              `Unexpected error while running "${command.name}":`,
              error
            );
          }
          process.exit(1);
        }
      });

    for (const opt of command.options || []) {
      cmd.option(
        opt.name,
        opt.description,
        opt.parse ?? ((val) => val),
        opt.default
      );
    }
  });

  await program.parseAsync(argv);
};
