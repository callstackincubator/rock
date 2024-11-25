import chalk from 'chalk';
import { Info } from '../types/index.js';
import {
  promptForConfigurationSelection,
  promptForSchemeSelection,
} from './prompts.js';
import { logger } from '@callstack/rnef-tools';

interface Args {
  scheme?: string;
  mode?: string;
  info: Info | undefined;
}

export async function selectFromInteractiveMode({
  scheme,
  mode,
  info,
}: Args): Promise<{ scheme?: string; mode?: string }> {
  let newScheme = scheme;
  let newMode = mode;

  const schemes = info?.schemes;
  if (schemes && schemes.length > 1 && scheme) {
    newScheme = await promptForSchemeSelection(schemes);
  } else {
    logger.debug(`Automatically selected ${chalk.bold(scheme)} scheme.`);
  }

  const configurations = info?.configurations;
  if (configurations && configurations.length > 1 && mode) {
    newMode = await promptForConfigurationSelection(configurations);
  } else {
    logger.debug(`Automatically selected ${chalk.bold(mode)} configuration.`);
  }

  return {
    scheme: newScheme,
    mode: newMode,
  };
}
