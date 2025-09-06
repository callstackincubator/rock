import {
  color,
  intro,
  isInteractive,
  note,
  outro,
  promptConfirm,
  promptGroup,
  promptMultiselect,
  promptPassword,
  promptSelect,
  promptText,
  relativeToCwd,
  RockError,
  type SupportedRemoteCacheProviders,
} from '@rock-js/tools';
import { vice } from 'gradient-string';
import type { RemoteCacheTemplateInfo, TemplateInfo } from '../templates.js';
import { validateProjectName } from './project-name.js';
import { getRockVersion } from './version.js';

export function printHelpMessage(
  templates: TemplateInfo[],
  platforms: TemplateInfo[],
) {
  console.log(`
     Usage: create-rock [options]

     Options:

       -h, --help                 Display help for command
       -v, --version              Output the version number
       -d, --dir                  Create project in specified directory
       -t, --template             Specify template to use
       -p, --platform             Specify platform(s) to use
       --plugin                   Specify plugin(s) to use
       --bundler                  Specify bundler to use
       --remote-cache-provider    Specify remote cache provider
       --override                 Override files in target directory
       --install                  Install Node.js dependencies

     Available templates:
       ${templates.map((t) => t.name).join(', ')}

     Available platforms:
       ${platforms.map((p) => p.name).join(', ')}
  `);
}

export function printVersionMessage() {
  console.log(`${getRockVersion()}`);
}

export function printWelcomeMessage() {
  console.log('');
  intro(`Welcome to ${color.bold(vice('Rock'))}!`);
}

export function printByeMessage(
  targetDir: string,
  pkgManager: string,
  installDeps: boolean,
) {
  const relativeDir = relativeToCwd(targetDir);

  const nextSteps = [
    `cd ${relativeDir}`,
    installDeps ? undefined : `${pkgManager} install`,
    `${pkgManager} run start      starts dev server`,
    `${pkgManager} run ios        builds and runs iOS app`,
    `${pkgManager} run android    builds and runs Android app`,
  ]
    .filter(Boolean)
    .join('\n');

  note(nextSteps, 'Next steps');
  outro('Success 🎉.');
}

export function promptProjectName(name?: string): Promise<string> {
  return promptText({
    message: 'What is your app named?',
    initialValue: name,
    validate: validateProjectName,
  });
}

export async function promptTemplate(
  templates: TemplateInfo[],
): Promise<TemplateInfo> {
  if (templates.length === 0) {
    throw new RockError('No templates found');
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
  platforms: TemplateInfo[],
): Promise<TemplateInfo[]> {
  if (platforms.length === 0) {
    throw new RockError('No platforms found');
  }

  const defaultPlatforms = platforms.filter(
    (platform) => platform.name === 'android' || platform.name === 'ios',
  );

  return promptMultiselect({
    message: 'What platforms do you want to start with?',
    initialValues: defaultPlatforms,
    // @ts-expect-error todo
    options: platforms.map((platform) => ({
      value: platform,
      label: platform.name,
    })),
  });
}

export function promptPlugins(
  plugins: TemplateInfo[],
): Promise<TemplateInfo[] | null> {
  if (plugins.length === 0 || !isInteractive()) {
    return Promise.resolve(null);
  }

  return promptMultiselect({
    message: 'Select plugins:',
    // @ts-expect-error todo fixup type
    options: plugins.map((plugin) => ({
      value: plugin,
      label: plugin.name,
    })),
    required: false,
  });
}

export function promptBundlers(
  bundlers: TemplateInfo[],
): Promise<TemplateInfo> {
  if (bundlers.length === 0) {
    throw new RockError('No bundlers found');
  }

  return promptSelect({
    message: 'Which bundler do you want to use?',
    initialValues: [bundlers[0]],
    // @ts-expect-error todo fixup type
    options: bundlers.map((bundler) => ({
      value: bundler,
      label: bundler.name,
    })),
  });
}

export function promptRemoteCacheProvider(
  providers: RemoteCacheTemplateInfo[],
): Promise<RemoteCacheTemplateInfo | null> {
  return promptSelect({
    message: 'Which remote cache provider do you want to use?',
    initialValue: providers[0],
    options: providers.map((provider) => ({
      value: provider,
      label: provider.displayName,
    })),
  });
}

export function promptRemoteCacheProvidersConfig(
  provider: SupportedRemoteCacheProviders,
) {
  switch (provider) {
    case 'github-actions':
      return promptGroup({
        owner: () => promptText({ message: 'GitHub owner' }),
        repo: () => promptText({ message: 'GitHub repo' }),
        token: () =>
          promptPassword({ message: 'GitHub Personal Access Token (PAT)' }),
      });
    case 's3':
      return promptGroup({
        bucket: () => promptText({ message: 'S3 bucket' }),
        region: () => promptText({ message: 'S3 region' }),
        accessKeyId: () => promptText({ message: 'S3 access key ID' }),
        secretAccessKey: () =>
          promptPassword({ message: 'S3 secret access key' }),
      });
  }
}

export function confirmOverrideFiles(targetDir: string) {
  return promptConfirm({
    message: `"${targetDir}" is not empty, please choose:`,
    confirmLabel: 'Continue and override files',
    cancelLabel: 'Cancel operation',
  });
}

export function promptInstallDependencies(): Promise<boolean> {
  return promptConfirm({
    message: 'Do you want to install dependencies?',
    confirmLabel: 'Yes',
    cancelLabel: 'No',
  });
}
