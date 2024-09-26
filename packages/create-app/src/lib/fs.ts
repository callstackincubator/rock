import fs from 'node:fs';
import nodePath from 'node:path';

export function isEmptyDir(path: string) {
  const files = fs.readdirSync(path);
  return files.length === 0 || (files.length === 1 && files[0] === '.git');
}

type CopyDirOptions = {
  skipFiles?: string[];
};

export function copyDir(
  from: string,
  to: string,
  { skipFiles = [] }: CopyDirOptions = {}
) {
  fs.mkdirSync(to, { recursive: true });

  for (const file of fs.readdirSync(from)) {
    const srcFile = nodePath.resolve(from, file);
    const stat = fs.statSync(srcFile);
    const distFile = nodePath.resolve(to, file);

    if (stat.isDirectory()) {
      copyDir(srcFile, distFile, { skipFiles });
    } else {
      fs.copyFileSync(srcFile, distFile);
    }
  }
}

export function removeDir(path: string) {
  if (fs.existsSync(path)) {
    fs.rmSync(path, { recursive: true });
  }
}

export function resolveAbsolutePath(path: string) {
  return nodePath.isAbsolute(path) ? path : nodePath.join(process.cwd(), path);
}
