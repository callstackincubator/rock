import * as fs from 'node:fs';
import * as nodePath from 'node:path';
import { RnefError } from './error.js';

export function relativeToCwd(path: string) {
  return nodePath.relative(process.cwd(), path);
}

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

export function findDirectoriesWithPattern(path: string, pattern: RegExp) {
  const files = fs.readdirSync(path);
  const result: string[] = [];
  for (const file of files) {
    const filePath = nodePath.join(path, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file.match(pattern)) {
        result.push(filePath);
      }
      result.push(...findDirectoriesWithPattern(filePath, pattern));
    }
  }
  return result;
}
