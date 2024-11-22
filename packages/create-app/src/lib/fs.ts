import fs from 'node:fs';
import nodePath from 'node:path';
import os from 'node:os';

export function isEmptyDirSync(path: string) {
  const files = fs.readdirSync(path);
  return files.length === 0 || (files.length === 1 && files[0] === '.git');
}

type CopyDirOptions = {
  skipFiles?: string[];
};

export function copyDirSync(
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
      copyDirSync(srcFile, distFile, { skipFiles });
    } else {
      // merge package.json files
      if (nodePath.basename(srcFile) === 'package.json') {
        const srcPackageJsonContents = JSON.parse(
          fs.readFileSync(srcFile, 'utf-8')
        );
        if (!fs.existsSync(distFile)) {
          fs.copyFileSync(srcFile, distFile);
        }
        const distPackageJsonContents = JSON.parse(
          fs.readFileSync(distFile, 'utf-8')
        );
        distPackageJsonContents.devDependencies = {
          ...distPackageJsonContents.devDependencies,
          ...srcPackageJsonContents.devDependencies,
        };
        fs.writeFileSync(
          distFile,
          JSON.stringify(distPackageJsonContents, null, 2)
        );
      } else {
        fs.copyFileSync(srcFile, distFile);
      }
    }
  }
}

export function removeDir(path: string) {
  if (fs.existsSync(path)) {
    fs.rmSync(path, { recursive: true });
  }
}
