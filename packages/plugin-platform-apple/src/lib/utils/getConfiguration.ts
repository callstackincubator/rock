import { logger, promptSelect, RnefError } from '@rnef/tools';
import type { Info } from '../types/index.js';

export async function getConfiguration(
  configurations: Info['configurations'],
  preselectedMode: string | undefined,
  interactive: boolean | undefined
) {
  let mode = preselectedMode;
  if (interactive) {
    if (configurations && configurations.length > 1 && !preselectedMode) {
      mode = await promptForConfigurationSelection(configurations);
    }
  }
  if (!mode) {
    mode = 'Debug';
  }
  invalidateConfiguration(configurations, mode);
  return mode;
}

function invalidateConfiguration(
  configurations: Info['configurations'],
  mode: string
) {
  if (!configurations || configurations.length === 0) {
    logger.warn(
      `Unable to check whether "${mode}" configuration exists in your project`
    );
    return;
  }

  if (!configurations.includes(mode)) {
    throw new RnefError(
      `Configuration "${mode}" doesn't exist. Please use one of the existing configurations: ${configurations
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
