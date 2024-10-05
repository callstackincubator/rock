import fs from 'node:fs';
import path, { dirname } from 'node:path';
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
import { fileURLToPath } from 'node:url';

const TEMPLATES = ['default'];

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

  const templateName = options.template ?? (await promptTemplate(TEMPLATES));

  const __dirname = dirname(fileURLToPath(import.meta.url));

  const srcDir = path.join(
    __dirname,
    // Workaround for getting the template from within the monorepo
    // TODO: implement downloading templates from NPM
    '../../../templates',
    `rnef-template-${templateName}`
  );

  if (!fs.existsSync(srcDir)) {
    throw new Error(`Invalid template: template "${templateName}" not found.`);
  }

  copyDir(srcDir, absoluteTargetDir);
  await editTemplate(projectName, absoluteTargetDir);

  printByeMessage(absoluteTargetDir);
}

create();
