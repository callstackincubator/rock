import * as fs from 'node:fs/promises';
import { withPlugins } from './ExpoConfigPlugins.js';
import { compileModsAsync } from './plugins/modCompiler.js';
import { withInternal } from './plugins/withInternal.js';
import type { ProjectInfo } from './types.js';

/**
 * Applies config plugins.
 */
export async function applyConfigPlugins(info: ProjectInfo) {
  if (!info.appJsonPath) {
    return;
  }

  const content = await fs.readFile(info.appJsonPath, { encoding: 'utf-8' });
  const { expo, ...rest } = JSON.parse(content);
  const appJsonConfig = expo || rest;

  if (
    !Array.isArray(appJsonConfig.plugins) ||
    appJsonConfig.plugins.length === 0
  ) {
    return;
  }

  return compileModsAsync(
    withPlugins(withInternal(appJsonConfig, info), appJsonConfig.plugins),
    info,
  );
}
