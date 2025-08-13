import { isInteractive, logger, promptSelect, RockError } from '@rock-js/tools';
import type { Info } from '../types/index.js';

export async function getConfiguration(
  configurations: Info['configurations'],
  preselectedConfiguration: string | undefined,
) {
  let configuration = preselectedConfiguration;
  if (
    configurations &&
    configurations.length > 1 &&
    !preselectedConfiguration
  ) {
    // This is default and common configuration for React Native projects.
    // In such cases we 90% want a Debug configuration.
    // For the rest 10% user can pass the --configuration flag.
    if (
      configurations.length === 2 &&
      configurations.includes('Debug') &&
      configurations.includes('Release')
    ) {
      configuration = 'Debug';
    } else if (isInteractive()) {
      configuration = await promptForConfigurationSelection(configurations);
      logger.info(
        `You can set configuration manually next time using "--configuration ${configuration}" flag.`,
      );
    }
  }
  if (!configuration) {
    configuration = 'Debug';
  }
  invalidateConfiguration(configurations, configuration);
  return configuration;
}

function invalidateConfiguration(
  configurations: Info['configurations'],
  configuration: string,
) {
  if (!configurations || configurations.length === 0) {
    logger.warn(
      `Unable to check whether "${configuration}" configuration exists in your project`,
    );
    return;
  }

  if (!configurations.includes(configuration)) {
    throw new RockError(
      `Configuration "${configuration}" doesn't exist. Please use one of the existing configurations: ${configurations
        .map((configuration) => `\n- ${configuration}`)
        .join('')}`,
    );
  }
}

function promptForConfigurationSelection(configurations: string[]) {
  return promptSelect({
    message: 'Select the configuration you want to use',
    options: configurations.map((value) => ({
      label: value,
      value: value,
    })),
  });
}
