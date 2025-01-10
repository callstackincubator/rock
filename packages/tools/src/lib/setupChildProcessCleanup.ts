import type { Subprocess } from 'nano-spawn';

/**
 * Handle termination of the child process. Child processes are not terminated when
 * the parent process is terminated e.g. with SIGINT or SIGTERM signals.
 * This helper is intended for use in long-running tasks like building with xcodebuild, gradlew, bundling, etc.
 */
export function setupChildProcessCleanup(childProcess: Subprocess) {
  // overwrite @clack/prompts setting raw mode for spinner and prompts,
  // which prevents listening for SIGINT and SIGTERM
  process.stdin.setRawMode(false);

  process.on('SIGINT', () => terminate());
  process.on('SIGTERM', () => terminate());

  const terminate = async () => {
    try {
      (await childProcess.nodeChildProcess).kill();
      process.exit(1);
    } catch {
      // ignore
    }
  };
}
