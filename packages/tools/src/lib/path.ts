import * as fs from 'node:fs';
import * as nodePath from 'node:path';
import { RnefError } from './error.js';

export function resolveAbsolutePath(path: string) {
  return nodePath.isAbsolute(path) ? path : nodePath.join(process.cwd(), path);
}

export function resolveFilenameUp(path: string, filename: string) {
  const filePath = nodePath.join(path, filename);
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  const parentDir = nodePath.dirname(path);
  if (parentDir === path) {
    throw new RnefError(
      `${filename} not found in any parent directory of ${path}`
    );
  }

  return resolveFilenameUp(parentDir, filename);
}
