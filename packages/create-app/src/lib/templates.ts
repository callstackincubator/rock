import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import packageJson from 'package-json';
import * as tar from 'tar';
import { resolveAbsolutePath } from './fs.js';

export type TemplateInfo = NpmTemplateInfo | LocalTemplateInfo;

export type NpmTemplateInfo = {
  name: string;
  version: string;
  packageName: string;
  directory?: string;

  localPath?: undefined;
};

export type LocalTemplateInfo = {
  name: string;
  localPath: string;
  directory?: string;

  version?: undefined;
  packageName?: undefined;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEMP_PACKAGES_PATH = path.join(__dirname, '../../../');
console.log('TEMP_PACKAGES_PATH', TEMP_PACKAGES_PATH);

const TEMP_TEMPLATES_PATH = path.join(TEMP_PACKAGES_PATH, '../templates');
console.log('TEMP_TEMPLATES_PATH', TEMP_TEMPLATES_PATH);

export const TEMPLATES: TemplateInfo[] = [
  {
    name: 'default',
    // version: 'latest',
    // packageName: '@callstack/rnef-template-default',
    localPath: path.join(TEMP_TEMPLATES_PATH, 'rnef-template-default'),
  },
];
console.log('TEMPLATES', TEMPLATES);

export const PLATFORMS: TemplateInfo[] = [
  {
    name: 'ios',
    // version: 'latest',
    // packageName: '@callstack/rnef-plugin-platform-ios/',
    localPath: path.join(
      TEMP_PACKAGES_PATH,
      'plugin-platform-ios',
      'dist/src/template'
    ),
  },
  {
    name: 'android',
    // version: 'latest',
    // packageName: '@callstack/rnef-plugin-platform-android',
    localPath: path.join(
      TEMP_PACKAGES_PATH,
      'plugin-platform-android',
      'dist/src/template'
    ),
  },
];
console.log('PLATFORMS', PLATFORMS);

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
      name: basename.slice(0, basename.length - ext.length),
      localPath: resolveAbsolutePath(name),
    };
  }

  // TODO: handle cases when template is github repo url

  // Otherwise, assume it's a package name
  // TODO: handle NPM version
  return {
    name: name,
    packageName: name,
    version: 'latest',
  };
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
    await fs.writeFile(tarballPath, Buffer.from(arrayBuffer));

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
