import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import packageJson from 'package-json';
import * as tar from 'tar';
import { resolveAbsolutePath } from './fs.js';

export type TemplateInfo = NpmTemplateInfo | LocalTemplateInfo;

export type NpmTemplateInfo = {
  type: 'npm';
  name: string;
  version: string;
  packageName: string;
  /** Directory inside package that contains the template */
  directory: string | undefined;
};

export type LocalTemplateInfo = {
  type: 'local';
  name: string;
  localPath: string;
  packageName: string;
  directory: string | undefined;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEMP_PACKAGES_PATH = findPackagesDir();
const TEMP_TEMPLATES_PATH = path.join(TEMP_PACKAGES_PATH, '../templates');

export const TEMPLATES: TemplateInfo[] = [
  {
    type: 'local',
    name: 'default',
    packageName: '@callstack/rnef-template-default',
    localPath: path.join(TEMP_TEMPLATES_PATH, 'rnef-template-default'),
    directory: '.',
  },
];

export const PLATFORMS: TemplateInfo[] = [
  {
    type: 'local',
    name: 'ios',
    packageName: '@callstack/rnef-plugin-platform-ios',
    localPath: path.join(TEMP_PACKAGES_PATH, 'plugin-platform-ios'),
    directory: 'dist/src/template',
  },
  {
    type: 'local',
    name: 'android',
    packageName: '@callstack/rnef-plugin-platform-android',
    localPath: path.join(TEMP_PACKAGES_PATH, 'plugin-platform-android'),
    directory: 'dist/src/template',
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

function getNpmLibraryVersion(name: string) {
  const splitName = name.split('@');
  if (splitName.length === 3 && splitName[0] === '') {
    return splitName[2];
  } else if (splitName.length === 2 && splitName[0] !== '') {
    return splitName[1];
  }
  return null;
}

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
export function extractTarballFile(tarballPath: string, targetDir: string) {
  return tar.extract({
    file: tarballPath,
    cwd: targetDir,
    strip: 1, // Remove the top-level directory
  });
}

function findPackagesDir() {
  let dir = __dirname;
  while (dir !== '/') {
    if (path.basename(dir) === 'packages') {
      return dir;
    }

    dir = path.dirname(dir);
  }

  throw new Error('"packages" directory not found');
}
