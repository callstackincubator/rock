import path from 'node:path';
import glob from 'fast-glob';
import spawn from 'nano-spawn';

const projects = glob.sync('packages/*/package.json');
const pmArg = process.argv[2] || '--pnpm';
const pm = pmArg.replace('--', '');

for (const project of projects) {
  const cwd = path.dirname(project);
  console.log(`Running "${pm} link" in ${cwd}`);
  await spawn(pm, ['link'], { cwd, stdio: 'inherit' });
}
