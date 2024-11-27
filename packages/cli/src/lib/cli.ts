import { Command } from 'commander';
import { getConfig } from '@callstack/rnef-config';
import { createRequire } from 'module';
import { logger } from '@callstack/rnef-tools';
import { logConfig } from '../config.js';
import { nativeFingerprintCommand } from './commands/fingerprint.js';

const require = createRequire(import.meta.url);

const { version } = require('./../../package.json');

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
      .action((args) => {
        try {
          command.action(args);
        } catch (error) {
          logger.error(
            `Unexpected error while running "${command.name}": ${error}`
          );
          process.exit(1);
        }
      });

    for (const opt of command.options || []) {
      if (opt.parse) {
        cmd.option(opt.name, opt.description, opt.parse, opt.default);
      } else {
        cmd.option(opt.name, opt.description, opt.default);
      }
    }
  });

  program.parse(argv);
};
