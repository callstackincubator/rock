import { isInteractive, logger, promptSelect, RockError } from '@rock-js/tools';
import path from 'path';
import type { Info } from '../types/index.js';

export async function getScheme(
  schemes: Info['schemes'],
  preselectedScheme: string | undefined,
  projectName: string,
) {
  let scheme = preselectedScheme;
  if (schemes && schemes.length > 1 && !preselectedScheme) {
    if (isInteractive()) {
      scheme = await promptForSchemeSelection(schemes);
      logger.info(
        `You can set scheme manually next time using "--scheme ${scheme}" flag.`,
      );
    }
  }
  if (!scheme) {
    scheme = path.basename(projectName, path.extname(projectName));
  }
  invalidateScheme(schemes, scheme);
  return scheme;
}

function invalidateScheme(schemes: Info['schemes'], scheme: string) {
  if (!schemes || schemes.length === 0) {
    logger.warn(
      `Unable to check whether "${scheme}" scheme exists in your project`,
    );
    return;
  }
  if (!schemes.includes(scheme)) {
    throw new RockError(
      `Scheme "${scheme}" doesn't exist. Please use one of the existing schemes: ${schemes
        .map((scheme) => `\n- ${scheme}`)
        .join('')}`,
    );
  }
}

function promptForSchemeSelection(schemes: string[]) {
  return promptSelect({
    message: 'Select the scheme you want to use',
    options: schemes.map((value) => ({
      label: value,
      value: value,
    })),
  });
}
