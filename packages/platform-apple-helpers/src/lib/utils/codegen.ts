import type { SubprocessError } from '@rnef/tools';
import { spawn } from '@rnef/tools';
import { RnefError } from '@rnef/tools';
import fs from 'fs';
import path from 'path';
import type { ApplePlatform } from '../types/index.js';

interface CodegenOptions {
  projectRoot: string;
  platformName: ApplePlatform;
  reactNativePath: string;
}

async function runCodegen(options: CodegenOptions) {
  if (fs.existsSync('build')) {
    fs.rmSync('build', { recursive: true });
  }

  const codegenScript = path.join(
    options.reactNativePath,
    'scripts/generate-codegen-artifacts.js'
  );

  try {
    await spawn('node', [
      codegenScript,
      '-p',
      options.projectRoot,
      '-o',
      process.cwd(),
      '-t',
      options.platformName,
    ]);
  } catch (error) {
    throw new RnefError('Failed to run React Native codegen script', {
      cause: (error as SubprocessError).stdout,
    });
  }
}

export default runCodegen;
