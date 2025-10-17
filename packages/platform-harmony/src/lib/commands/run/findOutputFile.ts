import fs from 'node:fs';
import path from 'node:path';
import type { DeviceData } from './listHarmonyDevices.js';

export async function findOutputFile(
  sourceDir: string,
  module: string,
  device?: DeviceData,
) {
  let hapName: string;
  if (device?.type === 'emulator') {
    hapName = `${module}-default-unsigned.hap`;
  } else {
    hapName = `${module}-default-signed.hap`;
  }
  const pathToHap = path.join(
    sourceDir,
    module,
    'build',
    'default',
    'outputs',
    'default',
    hapName,
  );
  return fs.existsSync(pathToHap) ? pathToHap : undefined;
}
