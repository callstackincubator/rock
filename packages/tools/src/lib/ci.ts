import * as fs from 'fs';
import * as path from 'path';
import { getProjectRoot } from './project.js';

export type ContinuousIntegrationProvider = 'github';

export function detectContinuousIntegration(): ContinuousIntegrationProvider | null {
  const root = getProjectRoot();
  if (fs.existsSync(path.join(root, '.github'))) {
    return 'github';
  }

  return null;
}
