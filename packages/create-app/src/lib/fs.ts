import fs from 'node:fs';
import nodePath from 'node:path';

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
      if (nodePath.basename(srcFile) === 'package.json') {
        mergePackageJsons(srcFile, distFile);
      } else {
        fs.copyFileSync(srcFile, distFile);
      }
    }
  }
}

function mergePackageJsons(from: string, to: string) {
  const src = JSON.parse(fs.readFileSync(from, 'utf-8'));
  if (!fs.existsSync(to)) {
    fs.copyFileSync(from, to);
  }
  const dist = JSON.parse(fs.readFileSync(to, 'utf-8'));
  dist.scripts = { ...dist.scripts, ...src.scripts };
  dist.devDependencies = removeDuplicateDependencies({
    devDependencies: { ...dist.devDependencies, ...src.devDependencies },
  }).devDependencies;

  fs.writeFileSync(to, JSON.stringify(dist, null, 2));
}

type PackageJsonDeps = {
  devDependencies: Record<string, string>;
};

function removeDuplicateDependencies(allDeps: PackageJsonDeps) {
  const uniqueDependencies = Object.keys(allDeps.devDependencies).reduce(
    (acc: string[], key) => {
      if (!acc.includes(key)) {
        acc.push(key);
      }
      return acc;
    },
    []
  );
  const newDeps = uniqueDependencies.reduce(
    (acc: PackageJsonDeps, key) => {
      if (allDeps.devDependencies[key]) {
        acc.devDependencies[key] = allDeps.devDependencies[key];
      }
      return acc;
    },
    { devDependencies: {} }
  );

  return {
    devDependencies: newDeps.devDependencies,
  };
}

export function removeDir(path: string) {
  if (fs.existsSync(path)) {
    fs.rmSync(path, { recursive: true });
  }
}
