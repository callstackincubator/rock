import chalk from 'chalk';
import makeDebug from 'debug';
import type { HashSource, NormalizedOptions } from '../Fingerprint.types.js';
import { getFileBasedHashSourceAsync } from './Utils.js';

const debug = makeDebug('expo:fingerprint:sourcer:PatchPackage');

export async function getPatchPackageSourcesAsync(
  projectRoot: string,
  options: NormalizedOptions
): Promise<HashSource[]> {
  const result = await getFileBasedHashSourceAsync(
    projectRoot,
    'patches',
    'patchPackage'
  );
  if (result != null) {
    debug(`Adding dir - ${chalk.dim('patches')}`);
    return [result];
  }
  return [];
}
