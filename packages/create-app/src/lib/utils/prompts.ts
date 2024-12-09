import { intro, multiselect, note, outro, select, text } from '@clack/prompts';
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkCancelPrompt } from '@callstack/rnef-tools';
import { parsePackageManagerFromUserAgent } from './parsers.js';
import { validateProjectName } from '../validate-project-name.js';
import { TemplateInfo } from '../templates.js';

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
  return checkCancelPrompt<string>(
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

  return checkCancelPrompt<TemplateInfo>(
    await select({
      message: 'Select a template:',
      // @ts-expect-error todo
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

  return checkCancelPrompt<TemplateInfo[]>(
    await multiselect({
      message: 'Select platforms:',
      // @ts-expect-error todo
      options: platforms.map((platform) => ({
        value: platform,
        label: platform.name,
      })),
    })
  );
}

export async function promptPlugins(
  plugins: TemplateInfo[]
): Promise<TemplateInfo[]> {
  if (plugins.length === 0) {
    throw new Error('No plugins found');
  }

  return checkCancelPrompt<TemplateInfo[]>(
    await multiselect({
      message: 'Select plugins:',
      initialValues: [plugins[0]],
      // @ts-expect-error todo fixup type
      options: plugins.map((plugin) => ({
        value: plugin,
        label: plugin.name,
      })),
    })
  );
}

export async function confirmOverrideFiles(targetDir: string) {
  const option = checkCancelPrompt<string>(
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
