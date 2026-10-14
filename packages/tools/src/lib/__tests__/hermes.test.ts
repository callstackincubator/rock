import fs from 'node:fs';
import path from 'node:path';
import { cleanup, getTempDirectory } from '@rock-js/test-helpers';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { runHermes } from '../hermes.js';

const resolveMock = vi.hoisted(() =>
  vi.fn((request: string) => {
    const modulePath = {
      'react-native': ['react-native', 'index.js'],
      'hermes-compiler/package.json': ['hermes-compiler', 'package.json'],
    }[request];
    if (!modulePath) {
      throw new Error(`Unexpected module resolution: ${request}`);
    }
    return path.join('project', 'node_modules', ...modulePath);
  }),
);
const spawnMock = vi.hoisted(() => vi.fn());
const loggerWarnMock = vi.hoisted(() => vi.fn());

vi.mock('node:module', () => ({
  createRequire: () => ({ resolve: resolveMock }),
}));
vi.mock('../env.js', () => ({ getLocalOS: () => 'linux' }));
vi.mock('../logger.js', () => ({ default: { warn: loggerWarnMock } }));
vi.mock('../project.js', () => ({ getProjectRoot: () => 'project' }));
vi.mock('../spawn.js', () => ({ spawn: spawnMock }));

const TEST_ROOT = getTempDirectory(`rock-hermes-${process.pid}`);
const bundleOutputPath = path.join(TEST_ROOT, 'main.jsbundle');
const sourcemapOutputPath = `${bundleOutputPath}.map`;
const hbcOutputPath = `${bundleOutputPath}.hbc`;
const hermesSourceMapPath = `${hbcOutputPath}.map`;
const originalExistsSync = fs.existsSync.bind(fs);
const run = () => runHermes({ bundleOutputPath, sourcemapOutputPath });

function mockHermes(composeError?: Error) {
  spawnMock.mockImplementation(async (_command, args: string[]) => {
    if (args.includes('-emit-binary')) {
      fs.writeFileSync(hbcOutputPath, 'Hermes bytecode');
      fs.writeFileSync(hermesSourceMapPath, '{}');
    } else if (composeError) {
      throw composeError;
    }
  });
}

describe('runHermes', () => {
  beforeEach(() => {
    cleanup(TEST_ROOT);
    fs.mkdirSync(TEST_ROOT, { recursive: true });
    fs.writeFileSync(bundleOutputPath, 'const answer = 42;');
    fs.writeFileSync(sourcemapOutputPath, '{"version":3,"mappings":""}');
    spawnMock.mockReset();
    loggerWarnMock.mockReset();
    mockHermes();
    vi.spyOn(fs, 'existsSync').mockImplementation((filePath) => {
      const basename = path.basename(filePath.toString());
      return basename === 'hermesc' || basename === 'compose-source-maps.js'
        ? true
        : originalExistsSync(filePath);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup(TEST_ROOT);
  });

  test('removes the intermediate Hermes source map after composition', async () => {
    await run();

    expect(fs.readFileSync(bundleOutputPath, 'utf8')).toBe('Hermes bytecode');
    expect(fs.existsSync(sourcemapOutputPath)).toBe(true);
    expect(fs.existsSync(hermesSourceMapPath)).toBe(false);
    expect(spawnMock).toHaveBeenCalledTimes(2);
    expect(loggerWarnMock).not.toHaveBeenCalled();
  });

  test('preserves the intermediate Hermes source map when composition fails', async () => {
    mockHermes(
      Object.assign(new Error('Composition failed'), {
        stderr: 'Composition failed',
      }),
    );

    await expect(run()).rejects.toMatchObject({
      name: 'RockError',
      message: 'Failed to run compose-source-maps script',
      cause: 'Composition failed',
    });

    expect(fs.existsSync(hermesSourceMapPath)).toBe(true);
  });

  test('warns and continues when removing the temporary source map fails', async () => {
    const cleanupError = new Error('File is locked');

    vi.spyOn(fs, 'rmSync').mockImplementationOnce(() => {
      throw cleanupError;
    });

    await run();

    expect(fs.readFileSync(bundleOutputPath, 'utf8')).toBe('Hermes bytecode');
    expect(fs.existsSync(hermesSourceMapPath)).toBe(true);
    expect(loggerWarnMock).toHaveBeenCalledWith(
      `Failed to remove temporary Hermes source map: ${hermesSourceMapPath}`,
      cleanupError,
    );
  });
});
