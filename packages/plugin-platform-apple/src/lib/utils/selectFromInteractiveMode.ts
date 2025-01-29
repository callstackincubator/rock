import type { Info } from '../types/index.js';
import {
  promptForConfigurationSelection,
  promptForSchemeSelection,
} from './prompts.js';

export async function selectFromInteractiveMode(
  info: Info,
  preselectedScheme?: string,
  preselectedMode?: string
): Promise<{ scheme?: string; mode?: string }> {
  let newScheme = preselectedScheme;
  let newMode = preselectedMode;

  const schemes = info.schemes;

  if (schemes && schemes.length > 1) {
    newScheme = preselectedScheme ?? await promptForSchemeSelection(schemes);
  }

  const configurations = info?.configurations;
  if (configurations && configurations.length > 1) {
    newMode = preselectedMode ?? await promptForConfigurationSelection(configurations);
  }

  return {
    scheme: newScheme,
    mode: newMode,
  };
}
