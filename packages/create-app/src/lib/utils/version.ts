import { logger } from '@rnef/tools';
import * as fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function getRnefVersion() {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));

    const packageJsonPath = join(__dirname, '../../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version;
  } catch (error) {
    logger.warn('Failed to get rnef version', error);
    return 'unknown';
  }
}
