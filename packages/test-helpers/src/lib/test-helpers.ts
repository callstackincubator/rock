import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

export const getTempDirectory = (name: string) =>
  path.resolve(os.tmpdir(), name);

export const cleanup = (directory: string) => {
  fs.rmSync(directory, { recursive: true, force: true, maxRetries: 10 });
};

/**
 * Creates a nested directory with files and their contents
 * writeFiles(
 *   '/home/tmp',
 *   {
 *     'package.json': '{}',
 *     'dir/file.js': 'module.exports = "x";',
 *   }
 * );
 */
export const writeFiles = (
  directory: string,
  files: { [filename: string]: string | NodeJS.ArrayBufferView }
) => {
  createDirectory(directory);

  Object.keys(files).forEach((fileOrPath) => {
    const dirname = path.dirname(fileOrPath);

    if (dirname !== '/') {
      createDirectory(path.join(directory, dirname));
    }
    fs.writeFileSync(
      path.resolve(directory, ...fileOrPath.split('/')),
      files[fileOrPath]
    );
  });
};

function createDirectory(path: string): void {
  try {
    fs.mkdirSync(path, { recursive: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}
