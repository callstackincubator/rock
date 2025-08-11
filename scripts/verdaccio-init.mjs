import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { intro, log, outro, spinner } from '@clack/prompts';
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
    intro('Verdaccio');

    backupNpmConfig();

    loader.start(`Writing .npmrc`);
    const npmConfigPath = path.join(ROOT_DIR, '.npmrc');
    fs.writeFileSync(
      npmConfigPath,
      `//localhost:${VERDACCIO_PORT}/:_authToken=secretToken\nregistry=${VERDACCIO_REGISTRY_URL}\n`,
    );
    loader.stop(`Wrote .npmrc: ${ROOT_DIR}`);

    await clearPackageStorage();

    loader.start('Starting Verdaccio...');
    const configPath = path.join(__dirname, '../.verdaccio/config.yml');
    const app = await runServer(configPath);

    app.listen(VERDACCIO_PORT, () => {
      loader.stop(`Verdaccio is running: ${VERDACCIO_REGISTRY_URL}`);
      log.info('Press Ctrl+C to stop Verdaccio');
    });

    // Handle process termination gracefully
    process.on('SIGINT', () => cleanup(app));
    process.on('SIGTERM', () => cleanup(app));
  } catch (error) {
    clearPackageStorage();
    restoreNpmConfig();
    console.error('Error', error);
    process.exit(1);
  }
}

function cleanup(app) {
  loader.start('Shutting down Verdaccio...');
  app.close(() => {
    loader.stop('Verdaccio has been stopped.');

    clearPackageStorage();
    restoreNpmConfig();
    outro('Done');
    process.exit(0);
  });
}

async function clearPackageStorage() {
  loader.start('Clearing package storage...');
  await spawn('rm', ['-rf', VERDACCIO_STORAGE_PATH]);
  loader.stop('Cleared package storage');
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
