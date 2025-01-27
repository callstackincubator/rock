import {
  intro,
  note,
  outro,
  promptConfirm,
  promptMultiselect,
  promptSelect,
  promptText,
  RnefError,
} from '@rnef/tools';
import path from 'path';
import type { TemplateInfo } from '../templates.js';
import { validateProjectName } from '../validate-project-name.js';
import { parsePackageManagerFromUserAgent } from './parsers.js';
import { getRnefVersion } from './version.js';

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
  console.log(`${getRnefVersion()}`);
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

  const relativeDir = path.relative(process.cwd(), targetDir);

  const nextSteps = [
    `cd ${relativeDir}`,
    `${pkgManagerCommand} install`,
    `${pkgManagerCommand} run start`,
  ].join('\n');

  note(nextSteps, 'Next steps');
  outro('Done.');
}

export function promptProjectName(): Promise<string> {
  return promptText({
    message: 'What is your app named?',
    validate: validateProjectName,
  });
}

export async function promptTemplate(
  templates: TemplateInfo[]
): Promise<TemplateInfo> {
  if (templates.length === 0) {
    throw new RnefError('No templates found');
  }

  return promptSelect({
    message: 'Select a template:',
    // @ts-expect-error todo
    options: templates.map((template) => ({
      value: template,
      label: template.name,
    })),
  });
}

export function promptPlatforms(
  platforms: TemplateInfo[]
): Promise<TemplateInfo[]> {
  if (platforms.length === 0) {
    throw new RnefError('No platforms found');
  }

  return promptMultiselect({
    message: 'Select platforms:',
    // @ts-expect-error todo
    options: platforms.map((platform) => ({
      value: platform,
      label: platform.name,
    })),
  });
}

export function promptPlugins(
  plugins: TemplateInfo[]
): Promise<TemplateInfo[]> {
  if (plugins.length === 0) {
    throw new RnefError('No plugins found');
  }

  return promptMultiselect({
    message: 'Select plugins:',
    initialValues: [plugins[0]],
    // @ts-expect-error todo fixup type
    options: plugins.map((plugin) => ({
      value: plugin,
      label: plugin.name,
    })),
  });
}

export function confirmOverrideFiles(targetDir: string) {
  return promptConfirm({
    message: `"${targetDir}" is not empty, please choose:`,
    confirmLabel: 'Continue and override files',
    cancelLabel: 'Cancel operation',
  });
}
