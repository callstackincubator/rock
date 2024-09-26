import {
  cancel,
  intro,
  isCancel,
  note,
  outro,
  select,
  text,
} from '@clack/prompts';
import fs from 'node:fs';
import path from 'node:path';
import { parsePackageManagerFromUserAgent } from './parsers';
import { validateProjectName } from './validate-project-name';

export function printHelpMessage(templates: string[]) {
  console.log(`
     Usage: create-rnef [options]
  
     Options:
     
       -h, --help       Display help for command
       -v, --version    Output the version number
       -d, --dir        Create project in specified directory
       --override       Override files in target directory
     
     Templates:
  
       ${templates.join(', ')}
  `);
}

export function printVersionMessage() {
  const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  console.log(`${packageJson.version}`);
}

export function printWelcomeMessage() {
  console.log('');
  intro(`Welcome to React Native Enterprise Framework!`);
}

export function printByeMessage(targetDir: string) {
  const pkgManager = parsePackageManagerFromUserAgent(
    process.env['npm_config_user_agent']
  );

  const nextSteps = [
    `cd ${targetDir}`,
    `${pkgManager} install`,
    `${pkgManager} run start`,
  ].join('\n');

  note(nextSteps, 'Next steps');
  outro('Done.');
}

export async function promptProjectName() {
  return checkCancel<string>(
    await text({
      message: 'What is your app named?',
      validate: validateProjectName,
    })
  );
}

export async function confirmOverrideFiles(targetDir: string) {
  const option = checkCancel<string>(
    await select({
      message: `"${targetDir}" is not empty, please choose:`,
      options: [
        { value: 'yes', label: 'Continue and override files' },
        { value: 'no', label: 'Cancel operation' },
      ],
    })
  );
  return option === 'yes';
}

export function cancelAndExit() {
  cancel('Operation cancelled.');
  process.exit(0);
}

function checkCancel<T>(value: unknown) {
  if (isCancel(value)) {
    cancelAndExit();
  }

  return value as T;
}
