import fs from 'node:fs';
import path from 'node:path';
import editTemplate from './edit-template';
import { parsePackageInfo } from './parsers';
import {
  cancelAndExit,
  printHelpMessage,
  printVersionMessage,
  confirmOverrideFiles,
  promptProjectName,
  printWelcomeMessage,
  printByeMessage,
  promptTemplate,
} from './prompts';
import { copyDir, isEmptyDir, removeDir, resolveAbsolutePath } from './fs';
import { printLogo } from './logo';
import { parseCliOptions } from './parse-cli-options';

const TEMPLATES: Array<'android' | 'ios'> = ['android', 'ios'];

async function create() {
  const options = parseCliOptions(process.argv.slice(2));

  if (options.help) {
    printHelpMessage(TEMPLATES);
    return;
  }

  if (options.version) {
    printVersionMessage();
    return;
  }

  printLogo();
  printWelcomeMessage();

  const projectName =
    (options.dir || options.name) ?? (await promptProjectName());
  const { targetDir } = parsePackageInfo(projectName);
  const absoluteTargetDir = resolveAbsolutePath(targetDir);

  if (
    !options.override &&
    fs.existsSync(absoluteTargetDir) &&
    !isEmptyDir(absoluteTargetDir)
  ) {
    const confirmOverride = await confirmOverrideFiles(absoluteTargetDir);
    if (!confirmOverride) {
      cancelAndExit();
    }
  }

  removeDir(absoluteTargetDir);

  const defaultProjectTemplate = path.join(
    __dirname,
    '../../../../../templates',
    'rnef-template-default'
  );

  const results = await promptTemplate(TEMPLATES);

  // default TS template
  copyDir(defaultProjectTemplate, absoluteTargetDir);
  createRNEFConfig(absoluteTargetDir, Array.from(results));

  // platform folder tempaltes
  for await (const { platform, platformPluginModuleName } of results) {
    const { templatePath, editTemplate: customPlatformEditTemplate } =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require(platformPluginModuleName).getTemplateInfo();

    if (!fs.existsSync(templatePath)) {
      throw new Error(
        `Invalid template: template "${platform}" not found in ${templatePath}.`
      );
    }

    copyDir(templatePath, absoluteTargetDir);

    if (customPlatformEditTemplate) {
      await customPlatformEditTemplate(projectName, absoluteTargetDir);
    }
  }

  await editTemplate(projectName, absoluteTargetDir);

  printByeMessage(absoluteTargetDir);
}

create();

function createRNEFConfig(
  absoluteTargetDir: string,
  platforms: Array<{ platform: string; platformPluginModuleName: string }>
) {
  const rnefConfig = path.join(absoluteTargetDir, 'rnef.config.js');
  fs.writeFileSync(
    rnefConfig,
    `module.exports = {
  plugins: {},
  platforms: {
    ${platforms
      .map(
        ({ platform, platformPluginModuleName }) =>
          `${platform}: require("${platformPluginModuleName}")(),`
      )
      .join('\n    ')}
  },
};
`
  );
}
