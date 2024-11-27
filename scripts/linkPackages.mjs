import spawn from 'nano-spawn';
import path from 'node:path';
import glob from 'fast-glob';

const projects = glob.sync('packages/*/package.json');

for (const project of projects) {
  const cwd = path.dirname(project);
  console.log(`Running "pnpm link" in ${cwd}`);
  await spawn('pnpm', ['link', '--global'], { cwd, stdio: 'inherit' });
}
