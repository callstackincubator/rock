import fs from 'node:fs';
import path from 'node:path';
import { spinner } from '@clack/prompts';
import {
  resolveAbsolutePath,
  cancelPromptAndExit,
} from '@callstack/rnef-tools';
import {
  renameCommonFiles,
  renamePlaceholder,
  rewritePackageJson,
} from './edit-template.js';
import { copyDirSync, isEmptyDirSync, removeDir } from './fs.js';
import { printLogo } from './logo.js';
import { parseCliOptions } from './parse-cli-options.js';
import { parsePackageInfo } from './parsers.js';
import {
  printHelpMessage,
  printVersionMessage,
  confirmOverrideFiles,
  promptProjectName,
  printWelcomeMessage,
  printByeMessage,
  promptTemplate,
  promptPlatforms,
  promptPlugins,
} from './prompts.js';
import {
  downloadTarballFromNpm,
  extractTarball,
  TemplateInfo,
  PLATFORMS,
  resolveTemplate as resolveTemplate,
  TEMPLATES,
  PLUGINS,
} from './templates.js';

export async function run() {
  const options = parseCliOptions(process.argv.slice(2));

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
      cancelPromptAndExit();
    }
  }

  removeDir(absoluteTargetDir);
  fs.mkdirSync(absoluteTargetDir, { recursive: true });

  const template = options.template
    ? resolveTemplate(TEMPLATES, options.template)
    : await promptTemplate(TEMPLATES);

  const platforms = options.platforms
    ? options.platforms.map((p) => resolveTemplate(PLATFORMS, p))
    : await promptPlatforms(PLATFORMS);

  const plugins = options.plugins
    ? options.plugins.map((p) => resolveTemplate(PLUGINS, p))
    : await promptPlugins(PLUGINS);

  await extractPackage(absoluteTargetDir, template);
  for (const platform of platforms) {
    await extractPackage(absoluteTargetDir, platform);
  }
  for (const plugin of plugins) {
    await extractPackage(absoluteTargetDir, plugin);
  }

  const loader = spinner();
  loader.start('Updating template...');
  rewritePackageJson(absoluteTargetDir, projectName);
  renameCommonFiles(absoluteTargetDir);
  renamePlaceholder(absoluteTargetDir, projectName);
  createConfig(absoluteTargetDir, platforms, plugins);
  loader.stop('Updated template.');

  printByeMessage(absoluteTargetDir);
}

async function extractPackage(absoluteTargetDir: string, pkg: TemplateInfo) {
  const loader = spinner();

  let tarballPath: string | null = null;
  // NPM package: download tarball file
  if (pkg.type === 'npm') {
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

    const localPath = await extractTarball(tarballPath, absoluteTargetDir);

    if (pkg.packageName) {
      fs.unlinkSync(tarballPath);
      loader.stop(`Downloaded and extracted package ${pkg.packageName}.`);
    } else {
      loader.stop(`Extracted package ${pkg.name}.`);
    }

    loader.start(`Copying extracted directory ${localPath}...`);
    copyDirSync(path.join(localPath, pkg.directory ?? ''), absoluteTargetDir);
    loader.stop(`Copied extracted directory ${localPath}.`);

    //removeDir(localPath);
    return;
  }

  if (pkg.type === 'local') {
    loader.start(`Copying local directory ${pkg.localPath}...`);
    copyDirSync(
      path.join(pkg.localPath, pkg.directory ?? ''),
      absoluteTargetDir
    );
    loader.stop(`Copied local directory ${pkg.localPath}.`);

    return;
  }

  // This should never happen as we have either NPM package or local path (tarball or directory).
  throw new Error(
    `Invalid state: template not found: ${JSON.stringify(pkg, null, 2)}`
  );
}

function createConfig(
  absoluteTargetDir: string,
  platforms: TemplateInfo[],
  plugins: TemplateInfo[]
) {
  const rnefConfig = path.join(absoluteTargetDir, 'rnef.config.mjs');
  fs.writeFileSync(rnefConfig, formatConfig(platforms, plugins));
}

export function formatConfig(
  platforms: TemplateInfo[],
  plugins: TemplateInfo[]
) {
  const platformsWithImports = platforms.filter(
    (template) => template.importName
  );
  const pluginsWithImports = plugins.filter((template) => template.importName);

  return `${[...platformsWithImports, ...pluginsWithImports]
    .map(
      (template) =>
        `import { ${template.importName} } from '${template.packageName}';`
    )
    .join('\n')}

export default {
  plugins: {
    ${pluginsWithImports
      .map((template) => `${template.name}: ${template.importName}(),`)
      .join('\n    ')}
  },
  platforms: {
    ${platformsWithImports
      .map((template) => `${template.name}: ${template.importName}(),`)
      .join('\n    ')}
  },
};
`;
}
