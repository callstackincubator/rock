import { Command } from 'commander';
import { getConfig } from '@callstack/rnef-config';
import { createRequire } from 'module';
import { logger } from '@callstack/rnef-tools';
import { logConfig } from '../config.js';

const require = createRequire(import.meta.url);

const { version } = require('./../../package.json');

const program = new Command();

program
  .name('rnef')
  .description('React Native Enterprise Framework CLI.')
  .option('--verbose', 'enable verbose logging')
  .version(version);

type CliOptions = {
  cwd?: string;
  argv?: string[];
};

export const cli = async ({ cwd, argv }: CliOptions = {}) => {
  const config = await getConfig(cwd);

  if (argv) {
    logger.setVerbose(argv.includes('--verbose'));
  }

  program
    .command('config')
    .option('-p, --platform <string>', 'Select platform, e.g. ios or android')
    .action(logConfig);

  // Register commands from the config
  config.commands?.forEach((command) => {
    const cmd = program
      .command(command.name)
      .description(command.description || '')
      .action(() => {
        try {
          command.action(program.args);
        } catch (e) {
          // TODO handle nicely
          logger.error(e as string);
          process.exit(1);
        }
      });

    for (const opt of command.options || []) {
      cmd.option(opt.name, opt.description ?? '');
    }
  });

  program.parse(argv);
};
