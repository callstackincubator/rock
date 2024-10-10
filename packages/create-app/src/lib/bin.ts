import fs from 'node:fs';
import path from 'node:path';
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
  promptPlatforms,
} from './prompts.js';
import {
  downloadTarballFromNpm,
  extractTarballFile,
  TemplateInfo,
  PLATFORMS,
  resolveTemplate as resolveTemplate,
  TEMPLATES,
} from './templates.js';

async function create() {
  const options = parseCliOptions(process.argv.slice(2));
  console.log(options);

  if (options.help) {
    printHelpMessage(TEMPLATES, PLATFORMS);
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

  const template = options.template
    ? resolveTemplate(TEMPLATES, options.template)
    : await promptTemplate(TEMPLATES);

  const platforms = options.platform
    ? options.platform.map((p) => resolveTemplate(PLATFORMS, p))
    : await promptPlatforms(PLATFORMS);

  console.log('Template', template);
  console.log('Platforms', platforms);
  extractPackage(absoluteTargetDir, template);
  for (const platform of platforms) {
    extractPackage(absoluteTargetDir, platform);
  }

  rewritePackageJson(absoluteTargetDir, projectName);
  renameFiles(absoluteTargetDir);
  renamePlaceholder(absoluteTargetDir, projectName);

  printByeMessage(absoluteTargetDir);
}

async function extractPackage(absoluteTargetDir: string, pkg: TemplateInfo) {
  const loader = spinner();

  let tarballPath: string | null = null;
  // NPM package: download tarball file
  if (pkg.packageName) {
    loader.start(`Downloading package ${pkg.packageName}@${pkg.version}...`);
    tarballPath = await downloadTarballFromNpm(
      pkg.packageName,
      pkg.version,
      absoluteTargetDir
    );
  }
  // Local tarball file
  else if (
    pkg.localPath?.endsWith('.tgz') ||
    pkg.localPath?.endsWith('.tar.gz') ||
    pkg.localPath?.endsWith('.tar')
  ) {
    tarballPath = pkg.localPath;
  }

  // Extract tarball file: either from NPM or local one
  if (tarballPath) {
    if (pkg.packageName) {
      loader.message(`Extracting package ${pkg.name}...`);
    } else {
      loader.start(`Extracting package ${pkg.name}...`);
    }

    await extractTarballFile(tarballPath, absoluteTargetDir);

    if (pkg.packageName) {
      fs.unlinkSync(tarballPath);
      loader.stop(`Downloaded and extracted package ${pkg.packageName}.`);
    } else {
      loader.stop(`Extracted package ${pkg.name}.`);
    }

    return;
  }

  if (pkg.localPath) {
    loader.start(`Copying local directory ${pkg.localPath}...`);
    copyDirSync(pkg.localPath, absoluteTargetDir);
    loader.stop(`Copied local directory ${pkg.localPath}.`);

    return;
  }

  // This should never happen as we have either NPM package or local path (tarball or directory).
  throw new Error(
    `Invalid state: template not found: ${JSON.stringify(pkg, null, 2)}`
  );
}

function createRNEFConfig(
  absoluteTargetDir: string,
  platforms: TemplateInfo[]
) {
  const rnefConfig = path.join(absoluteTargetDir, 'rnef.config.js');
  fs.writeFileSync(
    rnefConfig,
    `module.exports = {
  plugins: {},
  platforms: {
    ${platforms
      .map(
        (template) => `${template.name}: require("${template.localPath}")(),`
      )
      .join('\n    ')}
  },
};
`
  );
}

create();
