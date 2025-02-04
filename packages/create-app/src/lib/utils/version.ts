import * as fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '@rnef/tools';

export function getRnefVersion() {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));

    // Note: account for 'dist' folder
    const packageJsonPath = join(__dirname, '../../../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version;
  } catch (error) {
    logger.warn('Failed to get RNEF version', error);
    return null;
  }
}
