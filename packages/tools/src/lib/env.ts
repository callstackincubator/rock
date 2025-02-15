export type OperatingSystem = 'macos' | 'linux' | 'windows';

export function getLocalOS(): OperatingSystem {
  if (process.platform === 'darwin') {
    return 'macos';
  }

  if (process.platform === 'win32') {
    return 'windows';
  }

  // Otherwise, assume it's linux-like
  return 'linux';
}
