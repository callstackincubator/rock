import fs from 'node:fs';
import path from 'node:path';
import { getProjectRoot, logger, RnefError, spawn } from '@rnef/tools';

function getHermescPath() {
  const hermesPath = path.join(
    getProjectRoot(),
    'ios/Pods/hermes-engine/destroot/bin/hermesc'
  );

  if (!fs.existsSync(hermesPath)) {
    throw new RnefError(`Hermesc binary not found at ${hermesPath}`);
  }

  return hermesPath;
}

export async function runHermes({
  bundleOutputPath,
}: {
  bundleOutputPath: string;
}) {
  const hermesPath = getHermescPath();
  const hermescArgs = [
    '-emit-binary',
    '-max-diagnostic-width=80',
    '-O',
    '-w',
    '-out',
    bundleOutputPath,
    bundleOutputPath,
  ];

  try {
    await spawn(hermesPath, hermescArgs, {
      stdio: logger.isVerbose() ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    throw new RnefError(
      'Compiling JS bundle with Hermes failed. Use `--no-hermes` flag to disable Hermes.',
      {
        cause: error,
      }
    );
  }
}
