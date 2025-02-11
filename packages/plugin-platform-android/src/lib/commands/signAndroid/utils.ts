import path from 'node:path';
import { getDotRnefPath } from '@rnef/tools';

export function getSignOutputPath() {
  return path.join(getDotRnefPath(), 'android/sign');
}
