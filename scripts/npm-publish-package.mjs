import { readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [, , packageDirArg, ...publishArgs] = process.argv;

if (!packageDirArg) {
  console.error('Usage: node scripts/npm-publish-package.mjs <package-dir> [npm publish args...]');
  process.exit(1);
}

const packageDir = path.resolve(packageDirArg);
const packageJsonPath = path.join(packageDir, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

if (packageJson.private) {
  console.log(`Skipping private package in ${packageDir}`);
  process.exit(0);
}

if (!packageJson.name || !packageJson.version) {
  console.error(`Package at ${packageDir} is missing a name or version`);
  process.exit(1);
}

const packageRef = `${packageJson.name}@${packageJson.version}`;
const registry = 'https://registry.npmjs.org/';

const viewResult = spawnSync(
  'npm',
  ['view', packageRef, 'version', '--registry', registry, '--silent'],
  {
    cwd: packageDir,
    encoding: 'utf8',
  },
);

if (viewResult.status === 0) {
  console.log(`Skipping already published package ${packageRef}`);
  process.exit(0);
}

const viewOutput = `${viewResult.stdout}\n${viewResult.stderr}`;

if (!viewOutput.includes('E404') && !viewOutput.includes('404')) {
  process.stderr.write(viewOutput);
  process.exit(viewResult.status ?? 1);
}

console.log(`Publishing ${packageRef}`);

const publishResult = spawnSync('npm', ['publish', ...publishArgs], {
  cwd: packageDir,
  stdio: 'inherit',
});

process.exit(publishResult.status ?? 1);
