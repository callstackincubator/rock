import path from 'node:path';
import { getDotRnefPath } from '@rnef/tools';

export function getSignPath(platformName: string) {
  return path.join(getDotRnefPath(), platformName, 'sign');
}

export function getExtactedIpaPath(platformName: string) {
  return path.join(getSignPath(platformName), 'content');
}
