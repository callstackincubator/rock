import {
  cancel,
  intro,
  isCancel,
  multiselect,
  note,
  outro,
  select,
  text,
} from '@clack/prompts';
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePackageManagerFromUserAgent } from './parsers.js';
import { validateProjectName } from './validate-project-name.js';
import { TemplateInfo } from './templates.js';

export function printHelpMessage(
  templates: TemplateInfo[],
  platforms: TemplateInfo[]
) {
  console.log(`
     Usage: create-rnef [options]
  
     Options:
     
       -h, --help       Display help for command
       -v, --version    Output the version number
       -d, --dir        Create project in specified directory
       -t, --template       Specify template to use
       -p, --platform       Specify platform(s) to use
       --override       Override files in target directory
     
     Templates:
       ${templates.map((t) => t.name).join(', ')}

     Platforms:
       ${platforms.map((p) => p.name).join(', ')}
  `);
}

export function printVersionMessage() {
  const __dirname = dirname(fileURLToPath(import.meta.url));

  const packageJsonPath = join(__dirname, '..', '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  console.log(`${packageJson.version}`);
}

export function printWelcomeMessage() {
  console.log('');
  intro(`Hello There!`);
}

export function printByeMessage(targetDir: string) {
  const pkgManager = parsePackageManagerFromUserAgent(
    process.env['npm_config_user_agent']
  );

  const pkgManagerCommand = pkgManager?.name ?? 'npm';

  const nextSteps = [
    `cd ${targetDir}`,
    `${pkgManagerCommand} install`,
    `${pkgManagerCommand} run start`,
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

export async function promptTemplate(
  templates: TemplateInfo[]
): Promise<TemplateInfo> {
  if (templates.length === 0) {
    throw new Error('No templates found');
  }

  // if (templates.length === 1) {
  //   return templates[0];
  // }

  return checkCancel<TemplateInfo>(
    await select({
      message: 'Select a template:',
      options: templates.map((template) => ({
        value: template,
        label: template.name,
      })),
    })
  );
}

export async function promptPlatforms(
  platforms: TemplateInfo[]
): Promise<TemplateInfo[]> {
  if (platforms.length === 0) {
    throw new Error('No platforms found');
  }

  return checkCancel<TemplateInfo[]>(
    await multiselect({
      message: 'Select platforms:',
      options: platforms.map((platform) => ({
        value: platform,
        label: platform.name,
      })),
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
