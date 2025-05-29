import type { HashSourceDir, HashSourceFile } from '@expo/fingerprint';

export function fingerprintSourceDir(
  path: string,
  reason: string
): HashSourceDir {
  return {
    type: 'dir',
    filePath: path,
    reasons: [reason],
  };
}

export function fingerprintSourceFile(
  path: string,
  reason: string
): HashSourceFile {
  return {
    type: 'file',
    filePath: path,
    reasons: [reason],
  };
}
