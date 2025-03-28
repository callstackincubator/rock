import { spawn } from '@rnef/tools';

export async function runOnMacCatalyst(binaryPath: string, scheme: string) {
  const appProcess = spawn(`${binaryPath}/${scheme}`, [], {
    detached: true,
    stdio: 'ignore',
  });
  (await appProcess.nodeChildProcess).unref();
}
