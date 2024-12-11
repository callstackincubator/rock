import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { log, spinner } from '@clack/prompts';
import spawn from 'nano-spawn';
import { runServer } from 'verdaccio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');

const VERDACCIO_PORT = 4873;
const VERDACCIO_REGISTRY_URL = `http://localhost:${VERDACCIO_PORT}`;
const VERDACCIO_STORAGE_PATH = '/tmp/verdaccio-storage';

const loader = spinner();

async function startVerdaccio() {
  try {
    backupNpmConfig();

    loader.start(`Writing .npmrc`);
    const npmConfigPath = path.join(ROOT_DIR, '.npmrc');
    fs.writeFileSync(
      npmConfigPath,
      `//localhost:${VERDACCIO_PORT}/:_authToken=secretToken\nregistry=${VERDACCIO_REGISTRY_URL}\n`
    );
    loader.stop(`Wrote .npmrc: ${ROOT_DIR}`);

    loader.start('Starting Verdaccio...');
    const configPath = path.join(__dirname, '../.verdaccio/config.yml');
    const app = await runServer(configPath);

    app.listen(VERDACCIO_PORT, async () => {
      loader.stop(`Verdaccio is running on ${VERDACCIO_REGISTRY_URL}`);
      await removeAllPackages();
      await publishPackages();
      await publishTemplate();
    });

    // Handle process termination gracefully
    process.on('SIGINT', () => cleanup(app));
    process.on('SIGTERM', () => cleanup(app));
  } catch (error) {
    console.error('Error', error);
    process.exit(1);
  }
}

function cleanup(app) {
  loader.start('Shutting down Verdaccio...');
  app.close(() => {
    loader.stop('Verdaccio has been stopped.');

    removeAllPackages();
    restoreNpmConfig();
    process.exit(0);
  });
}

async function removeAllPackages() {
  loader.start('Removing previous packages...');
  await spawn('rm', ['-rf', VERDACCIO_STORAGE_PATH]);
  loader.stop('Removed previous packages');
}

async function publishPackages() {
  log.step('Publishing all packages to Verdaccio...');
  await spawn('pnpm', [
    '-r',
    'publish:npm',
    '--registry',
    VERDACCIO_REGISTRY_URL,
    '--no-git-checks',
    '--force',
  ]);
  log.step('Published all packages.');
}

async function publishTemplate() {
  log.step('Publishing template to Verdaccio...');
  await spawn(
    'pnpm',
    [
      'publish',
      '--registry',
      VERDACCIO_REGISTRY_URL,
      '--no-git-checks',
      '--force',
    ],
    { cwd: `${ROOT_DIR}/templates/rnef-template-default` }
  );
  log.step('Published template.');
}

function backupNpmConfig() {
  loader.start('Backing up npm config...');
  const npmConfigPath = path.join(ROOT_DIR, '.npmrc');
  fs.copyFileSync(npmConfigPath, `${npmConfigPath}.orig`);
  loader.stop('Backed up npm config.');
}

function restoreNpmConfig() {
  loader.start('Restoring npm config...');
  const npmConfigPath = path.join(ROOT_DIR, '.npmrc');
  fs.renameSync(`${npmConfigPath}.orig`, npmConfigPath);
  loader.stop('Restored npm config.');
}

startVerdaccio();
