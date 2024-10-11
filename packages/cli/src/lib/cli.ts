import { Command } from 'commander';
import { getConfig } from '@callstack/rnef-config';
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const {version} = require("./../../package.json");

const program = new Command();

program
  .name('rnef')
  .description('React Native Enterprise Framework CLI.')
  .version(version);

type CliOptions = {
  cwd?: string;
};

export const cli = async ({ cwd }: CliOptions = {}) => {
  const config = await getConfig(cwd);

  // Register commands from the config
  config.commands?.forEach((command) => {
    const cmd = program
      .command(command.name)
      .description(command.description || '')
      .action(async () => {
        try {
          command.action(program.args);
        } catch (e) {
          // TODO handle nicely
          console.log('Error: ', e);
          process.exit(1);
        }
      });

    for (const opt of command.options || []) {
      cmd.option(opt.name, opt.description ?? '');
    }
  });

  program.parse();
};
