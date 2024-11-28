import { exec } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runServer } from 'verdaccio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VERDACCIO_PORT = 4873;
const VERDACCIO_REGISTRY_URL = `http://localhost:${VERDACCIO_PORT}/`;
const VERDACCIO_STORAGE_PATH = '/tmp/verdaccio-storage';

async function startVerdaccio() {
  try {
    console.log('Starting Verdaccio...');
    const configPath = path.join(__dirname, './verdaccio.yaml');
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
  await exec(`rm -rf ${VERDACCIO_STORAGE_PATH}`, {
    stdio: 'inherit',
  });

  console.log('Publishing all packages to Verdaccio...');
  await exec(
    `pnpm -r publish --registry ${VERDACCIO_REGISTRY_URL} --no-git-checks --force`,
    {
      stdio: 'inherit',
    }
  );
  console.log('All packages published successfully!');
}

startVerdaccio();
