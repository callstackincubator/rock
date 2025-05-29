export * from './lib/prompts.js';
export * from './lib/env.js';
export * from './lib/error.js';
export { default as logger } from './lib/logger.js';
export * from './lib/fingerprint/index.js';
export * from './lib/fingerprint/utils.js';
export type * from './lib/fingerprint/types.js';
export { default as cacheManager } from './lib/cacheManager.js';
export * from './lib/parse-args.js';
export * from './lib/path.js';
export * from './lib/project.js';
export * from './lib/build-cache/common.js';
export * from './lib/build-cache/localBuildCache.js';
export { findDevServerPort } from './lib/dev-server/findDevServerPort.js';
export { isDevServerRunning } from './lib/dev-server/isDevServerRunning.js';
export { isInteractive } from './lib/isInteractive.js';
export { spawn, SubprocessError } from './lib/spawn.js';
export { color } from './lib/color.js';
export { runHermes } from './lib/hermes.js';
export {
  fetchCachedBuild,
  handleDownloadResponse,
} from './lib/build-cache/fetchCachedBuild.js';

let level = 0;

export function fnStart(name: string) {
  console.log(`${'  '.repeat(level * 2)}↘️ START ${name}`);
  level++;
}

export function fnEnd(name: string) {
  level--;
  console.log(`${'  '.repeat(level * 2)}↙️ END ${name}`);
}
