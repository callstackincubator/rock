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
} from './prompts';
import { copyDir, isEmptyDir, removeDir, resolveAbsolutePath } from './fs';
import { parseCliOptions } from './parse-args';

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

  printWelcomeMessage();

  const projectName =
    (options.dir || options.projectName) ?? (await promptProjectName());
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

  const templateName = TEMPLATES[0];
  // TODO: figure monorepo workaround
  const srcDir = path.join(__dirname, '..', `rnef-template-${templateName}`);
  if (!fs.existsSync(srcDir)) {
    throw new Error(`Invalid input: template "${templateName}" not found.`);
  }

  copyDir(srcDir, absoluteTargetDir);
  await editTemplate(projectName, absoluteTargetDir);

  printByeMessage(absoluteTargetDir);
}

create();
