import type { Options, Subprocess } from 'nano-spawn';
import nanoSpawn, { SubprocessError } from 'nano-spawn';

export function spawn(
  file: string,
  args?: readonly string[],
  options?: Options
): Subprocess {
  const childProcess = nanoSpawn(file, args, options);
  setupChildProcessCleanup(childProcess);
  return childProcess;
}

export { SubprocessError };

function setupChildProcessCleanup(childProcess: Subprocess) {
  // https://stackoverflow.com/questions/53049939/node-daemon-wont-start-with-process-stdin-setrawmodetrue/53050098#53050098
  if (process.stdin.isTTY) {
    // overwrite @clack/prompts setting raw mode for spinner and prompts,
    // which prevents listening for SIGINT and SIGTERM
    process.stdin.setRawMode(false);
  }

  const terminate = async () => {
    try {
      (await childProcess.nodeChildProcess).kill();
      process.exit(1);
    } catch {
      // ignore
    }
  };

  const sigintHandler = () => terminate();
  const sigtermHandler = () => terminate();

  process.on('SIGINT', sigintHandler);
  process.on('SIGTERM', sigtermHandler);

  const cleanup = () => {
    process.off('SIGINT', sigintHandler);
    process.off('SIGTERM', sigtermHandler);
  };

  childProcess.nodeChildProcess.finally(cleanup);
}
