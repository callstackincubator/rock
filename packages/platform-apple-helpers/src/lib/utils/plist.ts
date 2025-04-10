import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { RnefError, spawn, SubprocessError } from '@rnef/tools';

const execFileAsync = promisify(execFile);

type PListBuddyOptions = {
  xml?: boolean;
};

export async function readKeyFromPlist(
  plistPath: string,
  key: string,
  options: PListBuddyOptions = {}
) {
  try {
    const result = await plistBuddy(plistPath, `Print:${key}`, options);
    return result.stdout.trim();
  } catch (error) {
    throw new RnefError(`Error reading key ${key} from ${plistPath}`, {
      cause: error instanceof SubprocessError ? error.stderr : error,
    });
  }
}

async function plistBuddy(
  path: string,
  command: string,
  options?: PListBuddyOptions
) {
  const args = ['-c', command, path];
  if (options?.xml) {
    args.unshift('-x');
  }

  const result = await spawn('/usr/libexec/PlistBuddy', args, {
    stdio: 'pipe',
  });

  return result;
}

export async function readBufferFromPlist(
  plistPath: string,
  key: string
): Promise<Buffer> {
  try {
    const result = await binaryPlistBuddy(plistPath, `Print:${key}`);
    return Buffer.from(result.stdout, 'binary');
  } catch (error) {
    throw new RnefError(`Error reading key ${key} from ${plistPath}`, {
      cause: error instanceof SubprocessError ? error.stderr : error,
    });
  }
}

/**
 * Special version of plistBuddy that reads the output as binary. Use `execFile`
 * instead of nano-spawn which does not support binary output.
 */
async function binaryPlistBuddy(path: string, command: string) {
  const args = ['-c', command, path];
  const result = await execFileAsync('/usr/libexec/PlistBuddy', args, {
    encoding: 'binary',
  });

  return result;
}
