import { handlePortUnavailable } from './handlePortUnavailable.js';
import { isDevServerRunning } from './isDevServerRunning.js';
import { logAlreadyRunningBundler } from './port.js';

export const findDevServerPort = async (
  initialPort: number,
  root: string
): Promise<{
  port: number;
  startDevServer: boolean;
}> => {
  let port = initialPort;
  let startDevServer = true;

  const devServerStatus = await isDevServerRunning(port);

  if (
    typeof devServerStatus === 'object' &&
    devServerStatus.status === 'running'
  ) {
    if (devServerStatus.root === root) {
      startDevServer = false;
      logAlreadyRunningBundler(port);
    } else {
      const result = await handlePortUnavailable(port, root);
      [port, startDevServer] = [result.port, result.startDevServer];
    }
  } else if (devServerStatus === 'unrecognized') {
    const result = await handlePortUnavailable(port, root);
    [port, startDevServer] = [result.port, result.startDevServer];
  }

  return {
    port,
    startDevServer,
  };
};
