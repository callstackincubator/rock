import fs from 'node:fs';
import path from 'node:path';
import { parsePackageManagerFromUserAgent } from './parsers.js';

export function getPkgManager() {
  const fromUserAgent = parsePackageManagerFromUserAgent(
    process.env['npm_config_user_agent'],
  );
  if (fromUserAgent) {
    return fromUserAgent.name;
  }
  if (fs.existsSync(path.join(process.cwd(), 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (fs.existsSync(path.join(process.cwd(), 'yarn.lock'))) {
    return 'yarn';
  }
  if (
    fs.existsSync(path.join(process.cwd(), 'bun.lockb')) ||
    fs.existsSync(path.join(process.cwd(), 'bun.lock'))
  ) {
    return 'bun';
  }
  return 'npm';
}
