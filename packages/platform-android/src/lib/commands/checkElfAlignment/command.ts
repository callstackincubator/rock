import path from 'node:path';
import type { PluginApi } from '@rock-js/config';
import { outro, RockError } from '@rock-js/tools';
import { checkElfAlignment } from './checkElfAlignment.js';

export type CheckElfAlignmentFlags = {
  verbose?: boolean;
  binaryPath?: string;
};

const ARGUMENTS = [
  {
    name: 'binaryPath',
    description: 'Path to APK file to verify.',
  },
];

const OPTIONS = [
  {
    name: '--binary-path <string>',
    description: 'Path to APK file to verify.',
  },
];

export function registerCheckElfAlignmentCommand(
  api: PluginApi,
) {
  api.registerCommand({
    name: 'check-elf-alignment:android',
    description: 'Verify ELF alignment of shared libraries in an APK.',
    args: ARGUMENTS,
    options: OPTIONS,
    action: async (
      binaryPath: string | undefined,
      flags: CheckElfAlignmentFlags,
    ) => {
      const resolvedPath =
        flags.binaryPath ?? (binaryPath ? path.resolve(binaryPath) : '');
      if (!resolvedPath) {
        throw new RockError(
          'Missing APK path. Provide it as an argument or via --binary-path.',
        );
      }
      await checkElfAlignment(resolvedPath);
      outro('Success 🎉.');
    },
  });
}
