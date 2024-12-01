import fs from 'node:fs';
import path from 'node:path';
import nodePath from 'node:path';
import { shouldRenameFile } from './edit-template.js';

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
  newBasename: string,
  { skipFiles = [] }: CopyDirOptions = {}
) {
  fs.mkdirSync(to, { recursive: true });

  for (const file of fs.readdirSync(from)) {
    if (skipFiles.includes(path.basename(file))) {
      continue;
    }
    const srcFile = nodePath.resolve(from, file);
    const stat = fs.statSync(srcFile);
    const distFile = nodePath.resolve(to, file);

    const DEFAULT_PLACEHOLDER_NAME = 'HelloWorld';
    let newFileName = distFile;

    if (shouldRenameFile(distFile, DEFAULT_PLACEHOLDER_NAME)) {
      newFileName = renameBasename(
        distFile,
        DEFAULT_PLACEHOLDER_NAME,
        newBasename
      );
    } else if (
      shouldRenameFile(distFile, DEFAULT_PLACEHOLDER_NAME.toLowerCase())
    ) {
      newFileName = renameBasename(
        distFile,
        DEFAULT_PLACEHOLDER_NAME.toLowerCase(),
        newBasename.toLowerCase()
      );
    }

    if (stat.isDirectory()) {
      copyDirSync(srcFile, newFileName, newBasename, { skipFiles });
    } else {
      if (nodePath.basename(srcFile) === 'package.json') {
        mergePackageJsons(srcFile, distFile);
      } else {
        fs.copyFileSync(srcFile, newFileName);
      }
    }
  }
}

function renameBasename(filePath: string, oldName: string, newName: string) {
  return path.join(
    path.dirname(filePath),
    path.basename(filePath).replace(new RegExp(oldName, 'g'), newName)
  );
}

function mergePackageJsons(from: string, to: string) {
  const src = JSON.parse(fs.readFileSync(from, 'utf-8'));
  if (!fs.existsSync(to)) {
    fs.copyFileSync(from, to);
  }
  const dist = JSON.parse(fs.readFileSync(to, 'utf-8'));
  // @todo consider adding a warning when src keys are different from dist keys
  dist.scripts = { ...dist.scripts, ...src.scripts };
  dist.devDependencies = { ...dist.devDependencies, ...src.devDependencies };

  fs.writeFileSync(to, JSON.stringify(dist, null, 2));
}

export function removeDir(path: string) {
  if (fs.existsSync(path)) {
    fs.rmSync(path, { recursive: true });
  }
}
