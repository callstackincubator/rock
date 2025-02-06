import { RnefError, spawn, SubprocessError } from '@rnef/tools';

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

export async function readBufferPromPlist(
  plistPath: string,
  key: string
): Promise<Buffer> {
  try {
    const result = await plistBuddy(plistPath, `Print:${key}`);
    return Buffer.from(result.stdout);
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
  const plistBuddyArgs = ['-c', command, path];
  if (options?.xml) {
    plistBuddyArgs.unshift('-x');
  }

  const result = await spawn('/usr/libexec/PlistBuddy', plistBuddyArgs, {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return result;
}
