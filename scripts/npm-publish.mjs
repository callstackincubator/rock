import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { intro, spinner, log, outro } from '@clack/prompts';
import minimist from 'minimist';
import spawn from 'nano-spawn';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');

const loader = spinner();
const args = minimist(process.argv.slice(2));
const isVerbose = args.verbose || args.v;

async function run() {
  intro('NPM: privately publishing all packages');

  try {
    await publishPackages();
    await publishTemplate();
    outro('Done');
  } catch (error) {
    console.error('Error', error);
    process.exit(1);
  }
}

async function publishPackages() {
  loader.start('Publishing all packages to NPM (private)');

  // This is a workaround to make pnpm publish work with our templates.
  // PNPM removes execute (+x) flag from files in package, e.g. gradlew, so
  // we use `npm publish` instead of `pnpm publish` to publish packages.
  // This also prevents us from using `workspace:` dependencies.
  // This is a known issue: https://github.com/pnpm/pnpm/issues/8862
  const output = await spawn('pnpm', ['nx', 'run-many', '-t', 'publish:npm']);
  if (isVerbose) {
    log.message(output.stdout.toString());
  }
  loader.stop('Published all packages to NPM (private).');
}

async function publishTemplate() {
  loader.start('Publishing template to NPM (private)');
  const output = await spawn('npm', ['publish', '--access', 'restricted'], {
    cwd: `${ROOT_DIR}/templates/rnef-template-default`,
  });
  if (isVerbose) {
    log.message(output.stdout.toString());
  }
  loader.stop('Published template.');
}

run();
