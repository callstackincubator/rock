import path from 'node:path';
import type { PluginApi } from '@rock-js/config';
import { outro, RockError } from '@rock-js/tools';
import { validateElfAlignment } from './validateElfAlignment.js';

const ARGUMENTS = [
  {
    name: 'binaryPath',
    description: 'Path to APK file to validate.',
  },
];

export function registerValidateElfAlignmentCommand(api: PluginApi) {
  api.registerCommand({
    name: 'validate-elf-alignment',
    description: 'Validate ELF alignment of shared libraries in an APK.',
    args: ARGUMENTS,
    action: async (binaryPath: string | undefined) => {
      if (!binaryPath) {
        throw new RockError(
          'Missing APK path. Provide it as an argument.',
        );
      }
      if (path.extname(binaryPath).toLowerCase() !== '.apk') {
        throw new RockError(
          `Expected an .apk file, got "${path.extname(binaryPath) || 'no extension'}".`,
        );
      }
      await validateElfAlignment(binaryPath);
      outro('Success 🎉.');
    },
  });
}
