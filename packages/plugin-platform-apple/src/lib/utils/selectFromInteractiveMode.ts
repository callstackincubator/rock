import color from 'picocolors';
import { XcodeProjectInfo } from '../types/index.js';
import {
  promptForConfigurationSelection,
  promptForSchemeSelection,
} from './prompts.js';
import { logger } from '@rnef/tools';
import { getInfo } from './getInfo.js';

export async function selectFromInteractiveMode(
  xcodeProject: XcodeProjectInfo,
  sourceDir: string,
  scheme: string,
  mode: string
): Promise<{ scheme: string; mode: string }> {
  let newScheme = scheme;
  let newMode = mode;
  const info = await getInfo(xcodeProject, sourceDir);

  const schemes = info?.schemes;
  if (schemes && schemes.length > 1) {
    newScheme = await promptForSchemeSelection(schemes);
  } else {
    logger.debug(`Automatically selected ${color.bold(scheme)} scheme.`);
  }

  const configurations = info?.configurations;
  if (configurations && configurations.length > 1) {
    newMode = await promptForConfigurationSelection(configurations);
  } else {
    logger.debug(`Automatically selected ${color.bold(mode)} configuration.`);
  }

  return {
    scheme: newScheme,
    mode: newMode,
  };
}
