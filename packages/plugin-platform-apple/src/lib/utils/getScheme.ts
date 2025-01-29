import { logger, RnefError } from '@rnef/tools';
import path from 'path';
import type { Info } from '../types/index.js';
import { promptForSchemeSelection } from './prompts.js';

export async function getScheme(
  schemes: Info['schemes'],
  preselectedScheme: string | undefined,
  interactive: boolean | undefined,
  projectName: string
) {
  let scheme = preselectedScheme;
  if (interactive) {
    if (schemes && schemes.length > 1 && !preselectedScheme) {
      scheme = await promptForSchemeSelection(schemes);
    }
  }
  if (!scheme) {
    scheme = path.basename(projectName, path.extname(projectName));
  }
  invalidateScheme(schemes, scheme);
  return scheme;
}

export function invalidateScheme(schemes: Info['schemes'], scheme: string) {
  if (!schemes || schemes.length === 0) {
    logger.warn(
      `Unable to check whether "${scheme}" scheme exists in your project`
    );
    return;
  }
  if (!schemes.includes(scheme)) {
    throw new RnefError(
      `Scheme "${scheme}" doesn't exist. Please use one of the existing schemes: ${schemes
        .map((scheme) => `\n- ${scheme}`)
        .join('')}`
    );
  }
}
