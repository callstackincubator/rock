import path from 'node:path';
import type { PluginApi } from '@rock-js/config';
import { outro } from '@rock-js/tools';
import { beforeEach, expect, test, vi } from 'vitest';
import * as checkElfAlignmentModule from '../checkElfAlignment.js';
import { registerCheckElfAlignmentCommand } from '../command.js';

const pluginApi = {
  registerCommand: vi.fn(),
} as unknown as PluginApi;

beforeEach(() => {
  vi.clearAllMocks();
});

test('registers check-elf-alignment command metadata', () => {
  registerCheckElfAlignmentCommand(pluginApi);

  const [command] = vi.mocked(pluginApi.registerCommand).mock.calls[0];

  expect(command.name).toBe('check-elf-alignment:android');
  expect(command.args).toEqual(
    expect.arrayContaining([expect.objectContaining({ name: 'binaryPath' })]),
  );
  expect(command.options).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: '--binary-path <string>' }),
    ]),
  );
});

test('action uses --binary-path when provided', async () => {
  const checkElfAlignment = vi
    .spyOn(checkElfAlignmentModule, 'checkElfAlignment')
    .mockResolvedValue();
  registerCheckElfAlignmentCommand(pluginApi);
  const [command] = vi.mocked(pluginApi.registerCommand).mock.calls[0];

  await command.action(undefined, { binaryPath: '/tmp/app.apk' });

  expect(checkElfAlignment).toHaveBeenCalledWith('/tmp/app.apk');
  expect(outro).toHaveBeenCalledWith('Success 🎉.');
});

test('action resolves binary path argument', async () => {
  const checkElfAlignment = vi
    .spyOn(checkElfAlignmentModule, 'checkElfAlignment')
    .mockResolvedValue();
  registerCheckElfAlignmentCommand(pluginApi);
  const [command] = vi.mocked(pluginApi.registerCommand).mock.calls[0];

  await command.action('dist/app.apk', {});

  expect(checkElfAlignment).toHaveBeenCalledWith(path.resolve('dist/app.apk'));
});

test('action throws when APK path is missing', async () => {
  registerCheckElfAlignmentCommand(pluginApi);
  const [command] = vi.mocked(pluginApi.registerCommand).mock.calls[0];

  await expect(command.action(undefined, {})).rejects
    .toThrowErrorMatchingInlineSnapshot(
      `[RockError: Missing APK path. Provide it as an argument or via --binary-path.]`,
    );
});
