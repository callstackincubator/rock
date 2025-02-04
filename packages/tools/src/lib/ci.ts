import * as fs from 'node:fs';
import * as path from 'node:path';
import { getProjectRoot } from './project.js';

export type ContinuousIntegrationProvider = 'github';

export function detectContinuousIntegration(): ContinuousIntegrationProvider | null {
  const root = getProjectRoot();
  if (fs.existsSync(path.join(root, '.github'))) {
    return 'github';
  }

  return null;
}
