import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { PluginApi } from '@rock-js/config';
import {
  copyDirSync,
  normalizeProjectName,
  replacePlaceholder,
} from '@rock-js/tools';

async function getProjectName(projectRoot: string) {
  const appJsonPath = path.join(projectRoot, 'app.json');

  try {
    const appJsonContent = await fs.readFile(appJsonPath, 'utf-8');
    const { expo, ...rest } = JSON.parse(appJsonContent);
    const appJsonConfig = expo || rest;

    if (typeof appJsonConfig.name === 'string' && appJsonConfig.name.trim()) {
      return appJsonConfig.name;
    }
  } catch {
    // Fallback to directory name if app.json is unavailable or invalid.
  }

  return path.basename(projectRoot);
}

export async function regenNativeDirs(api: PluginApi) {
  const projectRoot = api.getProjectRoot();

  const iosTemplatePath = path.join(
    projectRoot,
    'node_modules',
    '@rock-js',
    'platform-ios',
    'template',
    'ios',
  );

  copyDirSync(iosTemplatePath, path.join(projectRoot, 'ios'));

  const androidTemplatePath = path.join(
    projectRoot,
    'node_modules',
    '@rock-js',
    'platform-android',
    'template',
    'android',
  );

  copyDirSync(androidTemplatePath, path.join(projectRoot, 'android'));

  replacePlaceholder(
    projectRoot,
    normalizeProjectName(await getProjectName(projectRoot)),
  );
}
