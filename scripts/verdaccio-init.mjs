import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { $ } from 'execa';
import { runServer } from 'verdaccio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');

const VERDACCIO_PORT = 4873;
const VERDACCIO_REGISTRY_URL = `http://localhost:${VERDACCIO_PORT}`;
const VERDACCIO_STORAGE_PATH = '/tmp/verdaccio-storage';

async function startVerdaccio() {
  try {
    console.log(`Writing .npmrc: ${ROOT_DIR}`);
    const npmConfigPath = path.join(ROOT_DIR, '.npmrc');
    fs.writeFileSync(
      npmConfigPath,
      `//localhost:${VERDACCIO_PORT}/:_authToken=secretToken\nregistry=${VERDACCIO_REGISTRY_URL}\n`
    );

    console.log('Starting Verdaccio...');
    const configPath = path.join(__dirname, 'verdaccio.yaml');
    const app = await runServer(configPath);

    app.listen(VERDACCIO_PORT, async () => {
      console.log(`Verdaccio is running on ${VERDACCIO_REGISTRY_URL}`);
      await removeAllPackages();
      await publishPackages();
      await publishTemplate();
    });

    // Handle process termination gracefully
    process.on('SIGINT', () => {
      console.log('Shutting down Verdaccio...');
      app.close(() => {
        console.log('Verdaccio has been stopped.');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Error', error);
    process.exit(1);
  }
}

async function removeAllPackages() {
  console.log('Removing previous packages...');
  const output = await $`rm -rf ${VERDACCIO_STORAGE_PATH}`;
  console.log(`Command: ${output.command}`);
  console.log(output.all);
}

async function publishPackages() {
  console.log('Publishing all packages to Verdaccio...');
  const output =
    await $`pnpm -r publish --registry ${VERDACCIO_REGISTRY_URL} --no-git-checks --force`;
  console.log(`Command: ${output.command}`);
  console.log(output.all);
}

async function publishTemplate() {
  console.log('Publishing template to Verdaccio...');
  const output = await $(
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
  console.log(`Command: ${output.command}`);
  console.log(output.all);
}

startVerdaccio();
