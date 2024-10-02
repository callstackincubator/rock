import fs from 'node:fs';
import { spinner } from '@clack/prompts';
import {
  renameFiles,
  renamePlaceholder,
  rewritePackageJson,
} from './edit-template.js';
import {
  copyDirSync,
  isEmptyDirSync,
  removeDir,
  resolveAbsolutePath,
} from './fs.js';
import { printLogo } from './logo.js';
import { parseCliOptions } from './parse-cli-options.js';
import { parsePackageInfo } from './parsers.js';
import {
  cancelAndExit,
  printHelpMessage,
  printVersionMessage,
  confirmOverrideFiles,
  promptProjectName,
  printWelcomeMessage,
  printByeMessage,
  promptTemplate,
} from './prompts.js';
import {
  downloadTarballFromNpm,
  extractTarballFile,
  resolveTemplateName,
  TEMPLATES,
} from './templates.js';

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
    !isEmptyDirSync(absoluteTargetDir)
  ) {
    const confirmOverride = await confirmOverrideFiles(absoluteTargetDir);
    if (!confirmOverride) {
      cancelAndExit();
    }
  }

  removeDir(absoluteTargetDir);
  fs.mkdirSync(absoluteTargetDir, { recursive: true });

  const template =
    resolveTemplateName(options.template) ?? (await promptTemplate(TEMPLATES));

  const loader = spinner();
  let tarballPath: string | null = null;

  // NPM package: download tarball file
  if (template.packageName) {
    loader.start(
      `Downloading package ${template.packageName}@${template.version}...`
    );
    tarballPath = await downloadTarballFromNpm(
      template.packageName,
      template.version,
      absoluteTargetDir
    );
  }
  // Local tarball file
  else if (
    template.localPath?.endsWith('.tgz') ||
    template.localPath?.endsWith('.tar.gz') ||
    template.localPath?.endsWith('.tar')
  ) {
    tarballPath = template.localPath;
  }

  // Extract tarball file: either from NPM or local one
  if (tarballPath) {
    if (template.packageName) {
      loader.message(`Extracting package ${template.name}.`);
    } else {
      loader.start(`Extracting package ${template.name}...`);
    }

    await extractTarballFile(tarballPath, absoluteTargetDir);

    if (template.packageName) {
      fs.unlinkSync(tarballPath);
      loader.stop(`Downloaded and extracted package ${template.packageName}.`);
    } else {
      loader.stop(`Extracted package ${template.name}.`);
    }
  } else if (template.localPath) {
    loader.start(`Copying local directory ${template.localPath}`);
    copyDirSync(template.localPath, absoluteTargetDir);
    loader.stop(`Copied local directory ${template.localPath}.`);
  } else {
    // This should never happen as we have either NPM package or local path (tarball or directory).
    throw new Error(
      `Invalid state: template not found: ${JSON.stringify(template, null, 2)}`
    );
  }

  rewritePackageJson(absoluteTargetDir, projectName);
  renameFiles(absoluteTargetDir);
  renamePlaceholder(absoluteTargetDir, projectName);

  printByeMessage(absoluteTargetDir);
}

create();
