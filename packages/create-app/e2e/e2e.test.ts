import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import {
  execAsync,
  getRandomString,
  getTempDirectory,
} from '@rnef/test-helpers';
import { beforeEach,describe, expect, it } from 'vitest';

/**
 * Perform following commands to test e2e locally (on macOS):
 * 1. nx reset
 * pnpm build
 * pnpm verdaccio:init (keep it running)
 * rm -rf ~/Library/Caches/pnpm/dlx/
 * pnpm e2e
 */

const VERDACCIO_REGISTRY_URL = 'http://localhost:4873';
const CREATE_APP_COMMAND = `pnpm create @rnef/app`;

const ROOT_DIR = path.resolve(__dirname, '../../..');
const TEMP_DIR = getTempDirectory('e2e-deploys');

const execArgs = {
  cwd: TEMP_DIR,
  env: { ...process.env, NPM_CONFIG_REGISTRY: VERDACCIO_REGISTRY_URL },
};

beforeEach(() => {
  mkdirSync(TEMP_DIR, { recursive: true });
});

describe('create-app command', { timeout: 30_000 }, () => {
  it(
    'should create a new project from default template',
    { timeout: 30_000 },
    async () => {
      const projectName = `test-default-template-${getRandomString(6)}`;
      const projectPath = path.resolve(TEMP_DIR, projectName);

      if (existsSync(projectPath)) {
        rmSync(projectPath, { recursive: true, force: true });
      }

      await execAsync(
        `${CREATE_APP_COMMAND} ${projectName} --template=default --platform=ios --platform=android --plugin=metro --remote-cache-provider=github-actions`,
        execArgs
      );

      const packageJsonPath = path.join(projectPath, 'package.json');
      expect(existsSync(packageJsonPath)).toBe(true);

      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      // TODO: fix template application
      expect(packageJson.name).toBe(projectName);
      expect(packageJson.version).toBe('1.0.0');
      expect(packageJson.private).toBe(true);
      expect(packageJson.description).not.toBeDefined();
      expect(packageJson.author).not.toBeDefined();
      expect(packageJson.license).not.toBeDefined();
      expect(packageJson.repository).not.toBeDefined();
      expect(packageJson.bugs).not.toBeDefined();
      expect(packageJson.homepage).not.toBeDefined();
      expect(packageJson.keywords).not.toBeDefined();
      expect(packageJson.packageManager).not.toBeDefined();
      expect(packageJson.publishConfig).not.toBeDefined();
    }
  );

  it('should create a new project from npm template', async () => {
    const projectName = `test-npm-template-${getRandomString(6)}`;
    const projectPath = path.resolve(TEMP_DIR, projectName);

    if (existsSync(projectPath)) {
      rmSync(projectPath, { recursive: true, force: true });
    }

    await execAsync(
      `${CREATE_APP_COMMAND} ${projectName} --template=@rnef/template-default --platform=ios --platform=android --plugin=metro --remote-cache-provider=github-actions`,
      execArgs
    );

    const packageJsonPath = path.join(projectPath, 'package.json');
    expect(existsSync(packageJsonPath)).toBe(true);

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    // TODO: fix template application
    expect(packageJson.name).toBe(projectName);
    expect(packageJson.version).toBe('1.0.0');
    expect(packageJson.private).toBe(true);
    expect(packageJson.description).not.toBeDefined();
    expect(packageJson.author).not.toBeDefined();
    expect(packageJson.license).not.toBeDefined();
    expect(packageJson.repository).not.toBeDefined();
    expect(packageJson.bugs).not.toBeDefined();
    expect(packageJson.homepage).not.toBeDefined();
    expect(packageJson.keywords).not.toBeDefined();
    expect(packageJson.packageManager).not.toBeDefined();
    expect(packageJson.publishConfig).not.toBeDefined();
  });

  it(
    'should create a new project from local directory template',
    { timeout: 30_000 },
    async () => {
      const projectName = `test-local-dir-template-${getRandomString(6)}`;
      const projectPath = path.resolve(TEMP_DIR, projectName);

      if (existsSync(projectPath)) {
        rmSync(projectPath, { recursive: true, force: true });
      }

      const templatePath = `${ROOT_DIR}/templates/rnef-template-default`;
      await execAsync(
        `${CREATE_APP_COMMAND} ${projectName} --template="${templatePath}" --platform=ios --platform=android --plugin=metro --remote-cache-provider=github-actions`,
        execArgs
      );

      const packageJsonPath = path.join(projectPath, 'package.json');
      expect(existsSync(packageJsonPath)).toBe(true);

      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      // TODO: fix template application
      expect(packageJson.name).toBe(projectName);
      expect(packageJson.version).toBe('1.0.0');
      expect(packageJson.private).toBe(true);
      expect(packageJson.description).not.toBeDefined();
      expect(packageJson.author).not.toBeDefined();
      expect(packageJson.license).not.toBeDefined();
      expect(packageJson.repository).not.toBeDefined();
      expect(packageJson.bugs).not.toBeDefined();
      expect(packageJson.homepage).not.toBeDefined();
      expect(packageJson.keywords).not.toBeDefined();
      expect(packageJson.packageManager).not.toBeDefined();
      expect(packageJson.publishConfig).not.toBeDefined();
    }
  );
});
