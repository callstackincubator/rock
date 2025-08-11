import { handlePortUnavailable } from './handlePortUnavailable.js';
import { isDevServerRunning } from './isDevServerRunning.js';
import { logAlreadyRunningBundler } from './logAlreadyRunningBundler.js';

export const findDevServerPort = async (
  initialPort: number,
  root: string,
): Promise<{
  port: string;
  startDevServer: boolean;
}> => {
  let port = initialPort;
  let startDevServer = true;

  const devServerStatus = await isDevServerRunning(port);

  if (devServerStatus.status === 'running') {
    if (devServerStatus.root === root) {
      startDevServer = false;
      logAlreadyRunningBundler(port);
    } else {
      const result = await handlePortUnavailable(port, root);
      [port, startDevServer] = [result.port, result.startDevServer];
    }
  } else if (devServerStatus.status === 'unrecognized') {
    const result = await handlePortUnavailable(port, root);
    [port, startDevServer] = [result.port, result.startDevServer];
  }

  return {
    port: String(port),
    startDevServer,
  };
};
