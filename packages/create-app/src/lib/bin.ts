import fs from 'node:fs';
import path from 'node:path';
import { spinner } from '@clack/prompts';
import {
  resolveAbsolutePath,
  cancelPromptAndExit,
  RnefError,
} from '@rnef/tools';
import {
  renameCommonFiles,
  replacePlaceholder,
} from './utils/edit-template.js';
import { copyDirSync, isEmptyDirSync, removeDirSync } from './utils/fs.js';
import { printLogo } from './utils/logo.js';
import { parseCliOptions } from './utils/parse-cli-options.js';
import { rewritePackageJson } from './utils/package-json.js';
import { parsePackageInfo } from './utils/parsers.js';
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
} from './utils/prompts.js';
import {
  TemplateInfo,
  PLATFORMS,
  resolveTemplate,
  TEMPLATES,
  PLUGINS,
} from './templates.js';
import {
  downloadTarballFromNpm,
  extractTarballToTempDirectory,
} from './utils/tarball.js';
import { initGitRepo } from './utils/git-init.js';
import { getRnefVersion } from './utils/version.js';

export async function run() {
  const options = parseCliOptions(process.argv.slice(2));

  const version = getRnefVersion();

  if (options.help) {
    printHelpMessage(TEMPLATES, PLATFORMS);
    return;
  }

  if (options.version) {
    printVersionMessage();
    return;
  }

  printLogo(version);
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

  removeDirSync(absoluteTargetDir);
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

  const loader = spinner();

  loader.start('Applying template, platforms and plugins');
  await extractPackage(absoluteTargetDir, template);
  for (const platform of platforms) {
    await extractPackage(absoluteTargetDir, platform);
  }
  for (const plugin of plugins) {
    await extractPackage(absoluteTargetDir, plugin);
  }

  renameCommonFiles(absoluteTargetDir);
  replacePlaceholder(absoluteTargetDir, projectName);
  rewritePackageJson(absoluteTargetDir, projectName);
  createConfig(absoluteTargetDir, platforms, plugins);
  loader.stop('Applied template, platforms and plugins.');

  loader.start('Initializing git repo');
  await initGitRepo(absoluteTargetDir, version);
  loader.stop('Git repo initialized.');

  printByeMessage(absoluteTargetDir);
}

async function extractPackage(absoluteTargetDir: string, pkg: TemplateInfo) {
  let tarballPath: string | null = null;
  // NPM package: download tarball file
  if (pkg.type === 'npm') {
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
    const localPath = await extractTarballToTempDirectory(
      absoluteTargetDir,
      tarballPath
    );

    if (pkg.packageName) {
      fs.unlinkSync(tarballPath);
    }

    copyDirSync(path.join(localPath, pkg.directory ?? ''), absoluteTargetDir);
    removeDirSync(localPath);

    return;
  }

  if (pkg.type === 'local') {
    copyDirSync(
      path.join(pkg.localPath, pkg.directory ?? ''),
      absoluteTargetDir
    );

    return;
  }

  // This should never happen as we have either NPM package or local path (tarball or directory).
  throw new RnefError(
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
