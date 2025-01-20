import { logger } from '@rnef/tools';
import isInteractive from 'is-interactive';
import type { XcodeProjectInfo } from '../types/index.js';
import { getInfo } from './getInfo.js';
import {
  promptForConfigurationSelection,
  promptForSchemeSelection,
} from './prompts.js';

export async function selectFromInteractiveMode(
  xcodeProject: XcodeProjectInfo,
  sourceDir: string,
  preselectedScheme?: string,
  preselectedMode?: string
): Promise<{ scheme?: string; mode?: string }> {
  if (!isInteractive()) {
    logger.warn(
      'Interactive mode is not supported in non-interactive environments.'
    );

    return {
      scheme: preselectedScheme,
      mode: preselectedMode,
    };
  }

  let newScheme;
  let newMode;
  const info = await getInfo(xcodeProject, sourceDir);

  const schemes = info?.schemes;

  if (schemes && schemes.length > 1) {
    newScheme = await promptForSchemeSelection(schemes, preselectedScheme);
  }

  const configurations = info?.configurations;
  if (configurations && configurations.length > 1) {
    newMode = await promptForConfigurationSelection(
      configurations,
      preselectedMode
    );
  }

  return {
    scheme: newScheme,
    mode: newMode,
  };
}
