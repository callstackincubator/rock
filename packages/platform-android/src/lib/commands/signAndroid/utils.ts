import { createRequire } from 'node:module';
import path from 'node:path';
import { getDotRnefPath, getProjectRoot } from '@rnef/tools';

const require = createRequire(import.meta.url);

export function getSignOutputPath() {
  return path.join(getDotRnefPath(), 'android/sign');
}

export async function getReactNativePackagePath() {
  const root = await getProjectRoot();
  const input = require.resolve('react-native', { paths: [root] });
  return path.dirname(input);
}
