import fs from 'node:fs';
import path from 'node:path';
import {
  cancelPromptAndExit,
  isInteractive,
  logger,
  promptConfirm,
  resolveAbsolutePath,
  RnefError,
  spawn,
  spinner,
  type SupportedRemoteCacheProviders,
} from '@rnef/tools';
import { gitInitStep, hasGitClient, isGitRepo } from './steps/git-init.js';
import type { TemplateInfo } from './templates.js';
import {
  BUNDLERS,
  PLATFORMS,
  PLUGINS,
  resolveTemplate,
  TEMPLATES,
} from './templates.js';
import {
  renameCommonFiles,
  replacePlaceholder,
} from './utils/edit-template.js';
import { copyDirSync, isEmptyDirSync, removeDirSync } from './utils/fs.js';
import { getPkgManager } from './utils/getPkgManager.js';
import { initInExistingProject } from './utils/initInExistingProject.js';
import { rewritePackageJson } from './utils/package-json.js';
import { parseCliOptions } from './utils/parse-cli-options.js';
import { parsePackageInfo } from './utils/parsers.js';
import {
  normalizeProjectName,
  validateProjectName,
} from './utils/project-name.js';
import {
  confirmOverrideFiles,
  printByeMessage,
  printHelpMessage,
  printVersionMessage,
  printWelcomeMessage,
  promptBundlers,
  promptInstallDependencies,
  promptPlatforms,
  promptPlugins,
  promptProjectName,
  promptRemoteCacheProvider,
  promptTemplate,
} from './utils/prompts.js';
import {
  downloadTarballFromNpm,
  extractTarballToTempDirectory,
} from './utils/tarball.js';
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

  printWelcomeMessage();

  if (isReactNativeProject(options.dir || process.cwd())) {
    const projectRoot = resolveAbsolutePath(options.dir || process.cwd());
    if ((await isGitRepo(projectRoot)) && (await hasGitClient())) {
      const { output } = await spawn('git', ['status', '--porcelain'], {
        cwd: projectRoot,
      });

      if (output.trim() !== '') {
        logger.error(
          'Git has uncommitted changes. Please commit or stash your changes before continuing with initializing RNEF in existing project.',
        );
        process.exit(1);
      }
    }

    const shouldInit = await promptConfirm({
      message: `Detected existing React Native project. Would you like to initialize RNEF in this project?`,
      confirmLabel: 'Yes',
      cancelLabel: 'No',
    });
    if (!shouldInit) {
      cancelPromptAndExit();
    }
    await initInExistingProject(projectRoot);
    return;
  }

  let projectName =
    (options.dir || options.name) ?? (await promptProjectName());
  if (validateProjectName(projectName)) {
    projectName = await promptProjectName(projectName);
  }

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

  const bundler = options.bundler
    ? resolveTemplate(BUNDLERS, options.bundler)
    : await promptBundlers(BUNDLERS);

  const plugins = options.plugins
    ? options.plugins.map((p) => resolveTemplate(PLUGINS, p))
    : await promptPlugins(PLUGINS);

  const remoteCacheProvider =
    options.remoteCacheProvider !== undefined ||
    options.remoteCacheProvider === false
      ? null
      : await promptRemoteCacheProvider();

  const shouldInstallDependencies =
    options.install || isInteractive()
      ? await promptInstallDependencies()
      : false;

  const loader = spinner();

  loader.start('Applying template, platforms and plugins');
  await extractPackage(absoluteTargetDir, template);
  for (const platform of platforms) {
    await extractPackage(absoluteTargetDir, platform);
  }
  await extractPackage(absoluteTargetDir, bundler);
  for (const plugin of plugins ?? []) {
    await extractPackage(absoluteTargetDir, plugin);
  }

  renameCommonFiles(absoluteTargetDir);
  replacePlaceholder(absoluteTargetDir, normalizeProjectName(projectName));
  // For package.json name we can use any valid name (kebab-case, PascalCase, etc).
  rewritePackageJson(absoluteTargetDir, projectName);
  createConfig(
    absoluteTargetDir,
    platforms,
    plugins,
    bundler,
    remoteCacheProvider,
  );
  loader.stop('Applied template, platforms and plugins.');

  const pkgManager = getPkgManager();

  if (shouldInstallDependencies) {
    await installDependencies(absoluteTargetDir, pkgManager);
  }

  await gitInitStep(absoluteTargetDir, version);

  printByeMessage(absoluteTargetDir, pkgManager, shouldInstallDependencies);
}

function isReactNativeProject(dir: string) {
  const packageJson = path.join(dir, 'package.json');
  if (!fs.existsSync(packageJson)) {
    return false;
  }
  const packageJsonContent = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
  return (
    packageJsonContent.dependencies?.['react-native'] !== undefined ||
    packageJsonContent.devDependencies?.['react-native'] !== undefined
  );
}

async function installDependencies(
  absoluteTargetDir: string,
  pkgManager: string,
) {
  const loader = spinner();
  loader.start(`Installing dependencies with ${pkgManager}`);
  await spawn(pkgManager, ['install'], { cwd: absoluteTargetDir });
  loader.stop(`Installed dependencies with ${pkgManager}`);
}

async function extractPackage(absoluteTargetDir: string, pkg: TemplateInfo) {
  let tarballPath: string | null = null;
  // NPM package: download tarball file
  if (pkg.type === 'npm') {
    tarballPath = await downloadTarballFromNpm(
      pkg.packageName,
      pkg.version,
      absoluteTargetDir,
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
      tarballPath,
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
      absoluteTargetDir,
    );

    return;
  }

  // This should never happen as we have either NPM package or local path (tarball or directory).
  throw new RnefError(
    `Invalid state: template not found: ${JSON.stringify(pkg, null, 2)}`,
  );
}

function createConfig(
  absoluteTargetDir: string,
  platforms: TemplateInfo[],
  plugins: TemplateInfo[] | null,
  bundler: TemplateInfo,
  remoteCacheProvider: SupportedRemoteCacheProviders | null,
) {
  const rnefConfig = path.join(absoluteTargetDir, 'rnef.config.mjs');
  fs.writeFileSync(
    rnefConfig,
    formatConfig(platforms, plugins, bundler, remoteCacheProvider),
  );
}

export function formatConfig(
  platforms: TemplateInfo[],
  plugins: TemplateInfo[] | null,
  bundler: TemplateInfo,
  remoteCacheProvider: SupportedRemoteCacheProviders | null,
) {
  const platformsWithImports = platforms.filter(
    (template) => template.importName,
  );
  const pluginsWithImports = plugins
    ? plugins.filter((template) => template.importName)
    : null;
  return `${[...platformsWithImports, ...(pluginsWithImports ?? []), bundler]
    .map(
      (template) =>
        `import { ${template.importName} } from '${template.packageName}';`,
    )
    .join('\n')}

export default {${
    pluginsWithImports
      ? `
  plugins: [
    ${pluginsWithImports
      .map((template) => `${template.importName}(),`)
      .join('\n    ')}
  ],`
      : ''
  }
  bundler: ${bundler.importName}(),
  platforms: {
    ${platformsWithImports
      .map((template) => `${template.name}: ${template.importName}(),`)
      .join('\n    ')}
  },
  remoteCacheProvider: ${
    remoteCacheProvider === null ? null : `'${remoteCacheProvider}'`
  },
};
`;
}
