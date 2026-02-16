import type { Dirent, PathLike } from 'node:fs';
import fs from 'node:fs';
import type { PluginApi } from '@rock-js/config';
import { logger, outro, RockError, spawn } from '@rock-js/tools';
import type { Mock } from 'vitest';
import { test, vi } from 'vitest';
import { registerValidateElfAlignmentCommand } from '../command.js';
import * as validateElfAlignmentModule from '../validateElfAlignment.js';
import { ELF_ALIGNMENT_REGEX, validateElfAlignment } from '../validateElfAlignment.js';

vi.mock('../../../paths.js', () => ({
  findAndroidBuildTool: vi.fn(),
  getAndroidBuildToolsPath: vi.fn(() => '/mock/sdk/build-tools'),
}));

const { findAndroidBuildTool } = await import('../../../paths.js');

const pluginApi = {
  registerCommand: vi.fn(),
} as unknown as PluginApi;

const MOCK_TEMP_DIR = '/tmp/mock_elf_';

const OBJDUMP_ALIGNED = [
  '  LOAD off    0x0000000000000000 vaddr 0x0000000000000000 paddr 0x0000000000000000 align 2**14',
  '  LOAD off    0x0000000000004000 vaddr 0x0000000000004000 paddr 0x0000000000004000 align 2**14',
].join('\n');

const OBJDUMP_UNALIGNED = [
  '  LOAD off    0x0000000000000000 vaddr 0x0000000000000000 paddr 0x0000000000000000 align 2**12',
  '  LOAD off    0x0000000000001000 vaddr 0x0000000000001000 paddr 0x0000000000001000 align 2**12',
].join('\n');

function makeDirent(name: string, isDir: boolean): Dirent {
  return {
    name,
    isDirectory: () => isDir,
    isFile: () => !isDir,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    isSymbolicLink: () => false,
    parentPath: '',
    path: '',
  };
}

function setupExtractedLibs(structure: Record<string, string[]>) {
  vi.spyOn(fs.promises, 'readdir').mockImplementation(
    ((dirPath: PathLike) => {
      const dir = dirPath.toString();

      if (dir === MOCK_TEMP_DIR) {
        return Promise.resolve([makeDirent('lib', true)]);
      }

      if (dir === `${MOCK_TEMP_DIR}/lib`) {
        const abis = Object.keys(structure).map((key) =>
          key.replace('lib/', ''),
        );
        return Promise.resolve(abis.map((abi) => makeDirent(abi, true)));
      }

      for (const [abiPath, files] of Object.entries(structure)) {
        const abi = abiPath.replace('lib/', '');
        if (dir === `${MOCK_TEMP_DIR}/lib/${abi}`) {
          return Promise.resolve(files.map((f) => makeDirent(f, false)));
        }
      }

      return Promise.resolve([]);
    }) as never,
  );
}

function mockSpawnForLibs(
  opts:
    | { alignment: string; alignmentByPath?: never }
    | { alignmentByPath: Record<string, string>; alignment?: never },
) {
  (spawn as Mock).mockImplementation((file: string, args: string[]) => {
    if (file === 'unzip') {
      return Promise.resolve({ output: '' });
    }

    if (file === 'file') {
      return Promise.resolve({
        output: `${args[0]}: ELF 64-bit LSB shared object`,
      });
    }

    if (file === 'objdump') {
      const filePath = args[1] ?? '';
      if (opts.alignmentByPath) {
        for (const [key, value] of Object.entries(opts.alignmentByPath)) {
          if (filePath.includes(key)) {
            return Promise.resolve({ output: value });
          }
        }
      }
      return Promise.resolve({
        output: opts.alignment ?? OBJDUMP_ALIGNED,
      });
    }

    return Promise.resolve({ output: '' });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.mocked(findAndroidBuildTool).mockReturnValue(null);
  vi.mocked(fs.existsSync).mockReturnValue(true);
  vi.spyOn(fs.promises, 'mkdtemp').mockResolvedValue(MOCK_TEMP_DIR);
  vi.spyOn(fs.promises, 'rm').mockResolvedValue();
});

// --- Command registration tests ---

test('registers validate-elf-alignment command metadata', () => {
  registerValidateElfAlignmentCommand(pluginApi);

  const [command] = vi.mocked(pluginApi.registerCommand).mock.calls[0];

  expect(command.name).toBe('validate-elf-alignment');
  expect(command.args).toEqual(
    expect.arrayContaining([expect.objectContaining({ name: 'binaryPath' })]),
  );
});

test('action passes binary path to validateElfAlignment', async () => {
  const spy = vi
    .spyOn(validateElfAlignmentModule, 'validateElfAlignment')
    .mockResolvedValue();
  registerValidateElfAlignmentCommand(pluginApi);
  const [command] = vi.mocked(pluginApi.registerCommand).mock.calls[0];

  await command.action('/tmp/app.apk');

  expect(spy).toHaveBeenCalledWith('/tmp/app.apk');
  expect(outro).toHaveBeenCalledWith('Success 🎉.');
});

test('action throws when APK path is missing', async () => {
  registerValidateElfAlignmentCommand(pluginApi);
  const [command] = vi.mocked(pluginApi.registerCommand).mock.calls[0];

  await expect(
    command.action(undefined),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[RockError: Missing APK path. Provide it as an argument.]`,
  );
});

test('action throws for non-APK file extension', async () => {
  registerValidateElfAlignmentCommand(pluginApi);
  const [command] = vi.mocked(pluginApi.registerCommand).mock.calls[0];

  await expect(
    command.action('/path/to/app.aab'),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[RockError: Expected an .apk file, got ".aab".]`,
  );
});

// --- ELF alignment regex tests ---

test.each([
  ['2**14', true],
  ['2**15', true],
  ['2**16', true],
  ['2**19', true],
  ['2**20', true],
  ['2**99', true],
  ['2**100', true],
  ['2**12', false],
  ['2**13', false],
  ['2**0', false],
  ['2**1', false],
  ['2**9', false],
  ['2**10', false],
])('ELF_ALIGNMENT_REGEX matches %s → %s', (value, expected) => {
  expect(ELF_ALIGNMENT_REGEX.test(value)).toBe(expected);
});

// --- validateElfAlignment internal tests ---

test('validateElfAlignment throws when APK not found', async () => {
  vi.mocked(fs.existsSync).mockReturnValue(false);

  await expect(
    validateElfAlignment('/missing/app.apk'),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[RockError: APK not found "/missing/app.apk".]`,
  );
});

test('validateElfAlignment handles APK with no native libs (unzip exit code 11)', async () => {
  (spawn as Mock).mockRejectedValue({ exitCode: 11 });

  await validateElfAlignment('/path/to/app.apk');

  expect(logger.info).toHaveBeenCalledWith(
    'No native shared libraries found in APK. Skipping ELF alignment check.',
  );
  expect(fs.promises.rm).toHaveBeenCalledWith(MOCK_TEMP_DIR, {
    recursive: true,
    force: true,
  });
});

test('validateElfAlignment passes when all libs are aligned', async () => {
  setupExtractedLibs({
    'lib/arm64-v8a': ['libfoo.so'],
  });
  mockSpawnForLibs({ alignment: OBJDUMP_ALIGNED });

  await validateElfAlignment('/path/to/app.apk');

  expect(logger.info).toHaveBeenCalledWith('ELF alignment check passed.');
});

test('validateElfAlignment fails when arm64-v8a lib is unaligned', async () => {
  setupExtractedLibs({
    'lib/arm64-v8a': ['libfoo.so'],
  });
  mockSpawnForLibs({ alignment: OBJDUMP_UNALIGNED });

  await expect(
    validateElfAlignment('/path/to/app.apk'),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[RockError: ELF alignment check failed.]`,
  );

  expect(logger.warn).toHaveBeenCalledWith(
    expect.stringContaining('must be 16KB aligned'),
  );
});

test('validateElfAlignment fails when x86_64 lib is unaligned', async () => {
  setupExtractedLibs({
    'lib/x86_64': ['libfoo.so'],
  });
  mockSpawnForLibs({ alignment: OBJDUMP_UNALIGNED });

  await expect(
    validateElfAlignment('/path/to/app.apk'),
  ).rejects.toThrow(RockError);
});

test('validateElfAlignment passes when only 32-bit libs are unaligned', async () => {
  setupExtractedLibs({
    'lib/arm64-v8a': ['libfoo.so'],
    'lib/armeabi-v7a': ['libfoo.so'],
  });
  mockSpawnForLibs({
    alignmentByPath: {
      arm64: OBJDUMP_ALIGNED,
      armeabi: OBJDUMP_UNALIGNED,
    },
  });

  await validateElfAlignment('/path/to/app.apk');

  expect(logger.info).toHaveBeenCalledWith(
    expect.stringContaining('1 unaligned libs'),
  );
  expect(logger.info).toHaveBeenCalledWith('ELF alignment check passed.');
});

test('validateElfAlignment logs zipalign not found notice when build tool is missing', async () => {
  setupExtractedLibs({ 'lib/arm64-v8a': ['libfoo.so'] });
  mockSpawnForLibs({ alignment: OBJDUMP_ALIGNED });

  await validateElfAlignment('/path/to/app.apk');

  expect(logger.info).toHaveBeenCalledWith(
    expect.stringContaining('zipalign'),
  );
});

test('validateElfAlignment cleans up temp dir even when error is thrown', async () => {
  setupExtractedLibs({ 'lib/arm64-v8a': ['libfoo.so'] });
  mockSpawnForLibs({ alignment: OBJDUMP_UNALIGNED });

  await expect(
    validateElfAlignment('/path/to/app.apk'),
  ).rejects.toThrow();

  expect(fs.promises.rm).toHaveBeenCalledWith(MOCK_TEMP_DIR, {
    recursive: true,
    force: true,
  });
});

test('validateElfAlignment throws when unzip fails with non-11 exit code', async () => {
  (spawn as Mock).mockRejectedValue({
    exitCode: 1,
    stderr: 'corrupt archive',
  });

  await expect(
    validateElfAlignment('/path/to/app.apk'),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[RockError: Failed to extract shared libraries from APK: /path/to/app.apk]`,
  );
});
