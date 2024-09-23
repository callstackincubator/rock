import fs from 'node:fs';
import path from 'node:path';
import {
  cancel,
  intro,
  isCancel,
  note,
  outro,
  select,
  text,
} from '@clack/prompts';
import minimist from 'minimist';
import { validateProjectName } from './validate-project-name';
import editTemplate  from './edit-template';

function cancelAndExit() {
  cancel('Operation cancelled.');
  process.exit(0);
}

function checkCancel<T>(value: unknown) {
  if (isCancel(value)) {
    cancelAndExit();
  }
  return value as T;
}

/**
 * 1. Input: 'foo'
 *    Output: folder `<cwd>/foo`, `package.json#name` -> `foo`
 *
 * 2. Input: 'foo/bar'
 *    Output: folder -> `<cwd>/foo/bar` folder, `package.json#name` -> `bar`
 *
 * 3. Input: '@scope/foo'
 *    Output: folder -> `<cwd>/@scope/bar` folder, `package.json#name` -> `@scope/foo`
 *
 * 4. Input: './foo/bar'
 *    Output: folder -> `<cwd>/foo/bar` folder, `package.json#name` -> `bar`
 *
 * 5. Input: '/root/path/to/foo'
 *    Output: folder -> `'/root/path/to/foo'` folder, `package.json#name` -> `foo`
 */
function formatProjectName(input: string) {
  const formatted = input.trim().replace(/\/+$/g, '');

  return {
    packageName: formatted.startsWith('@')
      ? formatted
      : path.basename(formatted),
    targetDir: formatted,
  };
}

function pkgFromUserAgent(userAgent: string | undefined) {
  if (!userAgent) return undefined;
  const pkgSpec = userAgent.split(' ')[0];
  const pkgSpecArr = pkgSpec.split('/');

  return {
    name: pkgSpecArr[0],
    version: pkgSpecArr[1],
  };
}

function isEmptyDir(path: string) {
  const files = fs.readdirSync(path);
  return files.length === 0 || (files.length === 1 && files[0] === '.git');
}

export type Argv = {
  help?: boolean;
  version?: boolean;
  dir?: string;
  override?: boolean;
};

function logHelpMessage(name: string, templates: string[]) {
  console.log(`
   Usage: create-${name} [options]

   Options:
   
     -h, --help       Display help for command
     -v, --version    Output the version number
     -d, --dir        Create project in specified directory
     --override       Override files in target directory
   
   Templates:

     ${templates.join(', ')}
`);
}

const name = 'rnef';
const TEMPLATES = ['basic'];

async function create() {
  const argv = minimist<Argv>(process.argv.slice(2), {
    alias: { h: 'help', d: 'dir', v: 'version' },
  });

  if (argv.help) {
    logHelpMessage(name, TEMPLATES);
    return;
  }

  const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
  const { version } = JSON.parse(
    await fs.promises.readFile(packageJsonPath, 'utf-8')
  );

  if (argv.version) {
    console.log(version);
    return;
  }

  console.log('');
  intro(`Welcome to React Native Enterprise Framework!`);

  const cwd = process.cwd();
  const pkgInfo = pkgFromUserAgent(process.env['npm_config_user_agent']);
  const pkgManager = pkgInfo ? pkgInfo.name : 'npm';

  const projectName =
    (argv.dir || argv._[0]) ??
    checkCancel<string>(
      await text({
        message: 'What is your app named?',
        validate: validateProjectName,
      })
    );

  const { targetDir, packageName } = formatProjectName(projectName);
  const distFolder = path.isAbsolute(targetDir)
    ? targetDir
    : path.join(cwd, targetDir);

  if (!argv.override && fs.existsSync(distFolder) && !isEmptyDir(distFolder)) {
    const option = checkCancel<string>(
      await select({
        message: `"${targetDir}" is not empty, please choose:`,
        options: [
          { value: 'yes', label: 'Continue and override files' },
          { value: 'no', label: 'Cancel operation' },
        ],
      })
    );

    if (option === 'no') {
      cancelAndExit();
    }
  }

  // Remove existing folder if exists
  if (fs.existsSync(distFolder)) {
    fs.rmSync(distFolder, { recursive: true });
  }

  const templateName = 'basic';
  // const srcFolder = path.join(__dirname, '..', `template-${templateName}`);
  // FIXME: hardcoded path, files are not included in the `dist/` folder
  const srcFolder =
    '/Users/szymonrybczak/callstack/rnef/packages/create-app/src/template-basic';

  if (!fs.existsSync(srcFolder)) {
    throw new Error(`Invalid input: template "${templateName}" not found.`);
  }

  copyFolder({
    from: srcFolder,
    to: distFolder,
    version,
    packageName,
  });

  await editTemplate(projectName, distFolder)

  const nextSteps = [
    `cd ${targetDir}`,
    `${pkgManager} install`,
    `${pkgManager} run start`,
  ];

  note(nextSteps.join('\n'), 'Next steps');

  outro('Done.');
}

function copyFolder({
  from,
  to,
  version,
  skipFiles = [],
}: {
  from: string;
  to: string;
  version: string;
  packageName?: string;
  isMergePackageJson?: boolean;
  skipFiles?: string[];
}) {
  fs.mkdirSync(to, { recursive: true });

  for (const file of fs.readdirSync(from)) {
    const srcFile = path.resolve(from, file);
    const stat = fs.statSync(srcFile);
    const distFile = path.resolve(to, file);

    if (stat.isDirectory()) {
      copyFolder({
        from: srcFile,
        to: distFile,
        version,
        skipFiles,
      });
    } else {
      fs.copyFileSync(srcFile, distFile);
    }
  }
}

create();
