import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { stripTemplatePackageJsonMetadata } from '../stripTemplatePackageJsonMetadata.js';

let tmpDir: string;

afterEach(() => {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('stripTemplatePackageJsonMetadata removes template npm metadata keys', () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'create-app-pkg-'));
  const packageJsonPath = path.join(tmpDir, 'package.json');
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify({
      name: 'my-app',
      version: '1.0.0',
      private: true,
      repository: { type: 'git', url: 'https://example.com/repo.git' },
      homepage: 'https://example.com',
      bugs: 'https://example.com/issues',
      license: 'MIT',
      author: 'ACME',
      scripts: { start: 'rock start' },
    }),
  );

  stripTemplatePackageJsonMetadata(tmpDir);

  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  expect(pkg.name).toBe('my-app');
  expect(pkg.repository).toBeUndefined();
  expect(pkg.homepage).toBeUndefined();
  expect(pkg.bugs).toBeUndefined();
  expect(pkg.license).toBeUndefined();
  expect(pkg.author).toBeUndefined();
  expect(pkg.scripts).toEqual({ start: 'rock start' });
});

test('stripTemplatePackageJsonMetadata is a no-op when package.json is missing', () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'create-app-pkg-'));
  expect(() => stripTemplatePackageJsonMetadata(tmpDir)).not.toThrow();
});
