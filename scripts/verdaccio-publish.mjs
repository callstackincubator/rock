import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { intro, outro, spinner } from '@clack/prompts';
import spawn from 'nano-spawn';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');

const VERDACCIO_REGISTRY_URL = `http://localhost:4873`;
const VERDACCIO_STORAGE_PATH = '/tmp/verdaccio-storage';

const loader = spinner({ indicator: 'timer' });

async function run() {
  intro('Verdaccio: publishing all packages');

  try {
    await clearPackageStorage();
    await publishPackages();
    await publishTemplate();
    outro('Done');
  } catch (error) {
    clearPackageStorage();
    console.error('Error', error);
    process.exit(1);
  }
}

async function clearPackageStorage() {
  loader.start('Clearing package storage');
  await spawn('rm', ['-rf', VERDACCIO_STORAGE_PATH]);
  loader.stop('Cleared package storage');
}

async function publishPackages() {
  loader.start('Publishing all packages to Verdaccio');

  // This is a workaround to make pnpm publish work with our templates.
  // PNPM removes execute (+x) flag from files in package, e.g. gradlew, so
  // we use `npm publish` instead of `pnpm publish` to publish packages.
  // This also prevents us from using `workspace:` dependencies.
  // This is a known issue: https://github.com/pnpm/pnpm/issues/8862
  await spawn('pnpm', ['-r', 'run', 'publish:verdaccio']);
  loader.stop('Published all packages.');
}

async function publishTemplate() {
  loader.start('Publishing template to Verdaccio');
  await spawn(
    'npm',
    [
      'publish',
      `--registry=${VERDACCIO_REGISTRY_URL}`,
      `--userconfig=${ROOT_DIR}/.npmrc`,
    ],
    { cwd: `${ROOT_DIR}/templates/rock-template-default` },
  );
  loader.stop('Published template.');
}

run();
