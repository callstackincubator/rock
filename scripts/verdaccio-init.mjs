import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { $ } from 'execa';
import { runServer } from 'verdaccio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VERDACCIO_PORT = 4873;
const VERDACCIO_REGISTRY_URL = `http://localhost:${VERDACCIO_PORT}`;
const VERDACCIO_STORAGE_PATH = '/tmp/verdaccio-storage';

async function startVerdaccio() {
  try {
    console.log('Starting Verdaccio...');
    const configPath = path.join(__dirname, 'verdaccio.yaml');
    const app = await runServer(configPath);

    app.listen(VERDACCIO_PORT, async () => {
      console.log(`Verdaccio is running on ${VERDACCIO_REGISTRY_URL}`);
      await publishPackages();
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

async function publishPackages() {
  console.log('Removing previous packages...');
  const run1 = await $`rm -rf ${VERDACCIO_STORAGE_PATH}`;
  console.log(run1.all);

  console.log('Publishing all packages to Verdaccio...');
  const run2 =
    await $`pnpm -r publish --registry ${VERDACCIO_REGISTRY_URL} --no-git-checks --force`;
  console.log(run2.all);

  console.log('All packages published successfully!');
}

startVerdaccio();
