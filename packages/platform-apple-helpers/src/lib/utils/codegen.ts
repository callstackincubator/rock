import type { SubprocessError } from '@rock-js/tools';
import { spawn } from '@rock-js/tools';
import { RockError } from '@rock-js/tools';
import fs from 'fs';
import path from 'path';
import type { ApplePlatform } from '../types/index.js';

interface CodegenOptions {
  projectRoot: string;
  platformName: ApplePlatform;
  reactNativePath: string;
  sourceDir: string;
}

async function runCodegen(options: CodegenOptions) {
  const buildDir = path.join(options.sourceDir, 'build');
  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true });
  }

  const codegenScript = path.join(
    options.reactNativePath,
    'scripts/generate-codegen-artifacts.js',
  );

  try {
    await spawn('node', [
      codegenScript,
      '-p',
      options.projectRoot,
      '-o',
      options.sourceDir,
      '-t',
      options.platformName,
    ]);
  } catch (error) {
    throw new RockError('Failed to run React Native codegen script', {
      cause: (error as SubprocessError).output,
    });
  }
}

export default runCodegen;
