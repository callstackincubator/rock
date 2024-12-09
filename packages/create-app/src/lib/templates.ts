import * as fs from 'node:fs';
import * as path from 'node:path';
import { resolveAbsolutePath } from '@callstack/rnef-tools';
import packageJson from 'package-json';
import * as tar from 'tar';

export type TemplateInfo = NpmTemplateInfo | LocalTemplateInfo;

export type NpmTemplateInfo = {
  type: 'npm';
  name: string;
  version: string;
  packageName: string;
  /** Directory inside package that contains the template */
  directory: string | undefined;
  importName?: string;
};

export type LocalTemplateInfo = {
  type: 'local';
  name: string;
  localPath: string;
  packageName: string;
  directory: string | undefined;
  importName?: string;
};

export const TEMPLATES: TemplateInfo[] = [
  {
    type: 'npm',
    name: 'default',
    packageName: '@callstack/rnef-template-default',
    version: 'latest',
    directory: '.',
  },
];

export const PLUGINS: TemplateInfo[] = [
  {
    type: 'npm',
    name: 'metro',
    packageName: '@callstack/rnef-plugin-metro',
    version: 'latest',
    directory: 'src/template',
    importName: 'pluginMetro',
  },
  {
    type: 'npm',
    name: 'repack',
    packageName: '@callstack/rnef-plugin-repack',
    version: 'latest',
    directory: 'src/template',
    importName: 'pluginRepack',
  },
];

export const PLATFORMS: TemplateInfo[] = [
  {
    type: 'npm',
    name: 'ios',
    packageName: '@callstack/rnef-plugin-platform-ios',
    version: 'latest',
    directory: 'src/template',
    importName: 'pluginPlatformIOS',
  },
  {
    type: 'npm',
    name: 'android',
    packageName: '@callstack/rnef-plugin-platform-android',
    version: 'latest',
    directory: 'src/template',
    importName: 'pluginPlatformAndroid',
  },
];

export function resolveTemplate(
  templates: TemplateInfo[],
  name: string
): TemplateInfo {
  // Check if the template is a template from the list
  const templateFromList = templates.find((t) => t.name === name);
  if (templateFromList) {
    return templateFromList;
  }

  // Check filesystem paths: both folders and .tgz
  if (
    name.startsWith('./') ||
    name.startsWith('../') ||
    name.startsWith('/') ||
    name.startsWith('file:///')
  ) {
    if (name.startsWith('file://')) {
      name = name.slice(7);
    }

    const basename = path.basename(name);
    const ext = path.extname(basename);

    return {
      type: 'local',
      name: basename.slice(0, basename.length - ext.length),
      localPath: resolveAbsolutePath(name),
      directory: '.',
      packageName: basename.slice(0, basename.length - ext.length),
    };
  }

  // TODO: handle cases when template is github repo url

  // Otherwise, assume it's a npm package
  return {
    type: 'npm',
    name: getNpmLibraryName(name),
    packageName: getNpmLibraryName(name),
    directory: '.',
    version: getNpmLibraryVersion(name) ?? 'latest',
  };
}

// handles `package@x.y.z` and `@scoped/package@x.y.z` package naming schemes
function getNpmLibraryVersion(name: string) {
  const splitName = name.split('@');
  if (splitName.length === 3 && splitName[0] === '') {
    return splitName[2];
  } else if (splitName.length === 2 && splitName[0] !== '') {
    return splitName[1];
  }
  return null;
}

// handles `package@x.y.z` and `@scoped/package@x.y.z` package naming schemes
function getNpmLibraryName(name: string) {
  const splitName = name.split('@');
  if (splitName.length === 3 && splitName[0] === '') {
    return `@${splitName[1]}`;
  } else if (splitName.length === 2 && splitName[0] !== '') {
    return splitName[0];
  }
  return name;
}

export async function downloadTarballFromNpm(
  packageName: string,
  version = 'latest',
  targetDir: string
) {
  try {
    const metadata = await packageJson(packageName, { version });

    const tarballUrl = metadata['dist']?.tarball;
    if (!tarballUrl) {
      throw new Error('Tarball URL not found.');
    }

    console.log('tarballUrl', tarballUrl);
    const response = await fetch(tarballUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch package: ${response.statusText}`);
    }

    const tarballPath = path.join(
      targetDir,
      `${packageName.replace('/', '-')}.tgz`
    );
    // Write the tarball to disk
    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(tarballPath, Buffer.from(arrayBuffer));

    return tarballPath;
  } catch (error) {
    console.error(`Error downloading package`, error);
    throw error;
  }
}

// This automatically handles both .tgz and .tar files
export async function extractTarball(
  tarballPath: string,
  targetDir: string
): Promise<string> {
  const archiveName = path.basename(tarballPath, path.extname(tarballPath));
  const tempFolder = path.join(
    targetDir,
    '.tmp',
    `${archiveName}-${Date.now()}`
  );
  fs.mkdirSync(tempFolder, { recursive: true });

  await tar.extract({
    file: tarballPath,
    cwd: tempFolder,
    strip: 1, // Remove top-level directory
  });

  return tempFolder;
}
