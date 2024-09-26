import { Command } from 'commander';
import { version } from '../../package.json';
import { getConfig } from './getConfig';

const program = new Command();

program
  .name('rnef')
  .description('React Native Enterprise Framework CLI.')
  .version(version);

export const cli = async () => {
  const config = await getConfig();

  // Register commands from the config
  config.commands?.forEach((command) => {
    program
      .command(command.name)
      .description(command.description || '')
      .action(async () => {
        try {
          await command.action(config);
        } catch (e) {
          // TODO handle nicely
          console.log('Error: ', e);
          process.exit(1);
        }
      });
  });

  program.parse();
};
