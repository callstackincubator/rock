import { logger, promptSelect, RnefError } from '@rnef/tools';
import type { Info } from '../types/index.js';

export async function getConfiguration(
  configurations: Info['configurations'],
  preselectedConfiguration: string | undefined,
  interactive: boolean | undefined
) {
  let configuration = preselectedConfiguration;
  if (interactive) {
    if (
      configurations &&
      configurations.length > 1 &&
      !preselectedConfiguration
    ) {
      configuration = await promptForConfigurationSelection(configurations);
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
  configuration: string
) {
  if (!configurations || configurations.length === 0) {
    logger.warn(
      `Unable to check whether "${configuration}" configuration exists in your project`
    );
    return;
  }

  if (!configurations.includes(configuration)) {
    throw new RnefError(
      `Configuration "${configuration}" doesn't exist. Please use one of the existing configurations: ${configurations
        .map((configuration) => `\n- ${configuration}`)
        .join('')}`
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
