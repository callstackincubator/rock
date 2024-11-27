import * as nodePath from 'node:path';

export function resolveAbsolutePath(path: string) {
  return nodePath.isAbsolute(path) ? path : nodePath.join(process.cwd(), path);
}
