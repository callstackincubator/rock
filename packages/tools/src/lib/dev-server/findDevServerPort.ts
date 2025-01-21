import handlePortUnavailable from './handlePortUnavailable.js';
import isPackagerRunning from './isPackagerRunning.js';
import {logAlreadyRunningBundler} from './port.js';

const findDevServerPort = async (
  initialPort: number,
  root: string,
): Promise<{
  port: number;
  startPackager: boolean;
}> => {
  let port = initialPort;
  let startPackager = true;

  const packagerStatus = await isPackagerRunning(port);

  if (
    typeof packagerStatus === 'object' &&
    packagerStatus.status === 'running'
  ) {
    if (packagerStatus.root === root) {
      startPackager = false;
      logAlreadyRunningBundler(port);
    } else {
      const result = await handlePortUnavailable(port, root);
      [port, startPackager] = [result.port, result.packager];
    }
  } else if (packagerStatus === 'unrecognized') {
    const result = await handlePortUnavailable(port, root);
    [port, startPackager] = [result.port, result.packager];
  }

  return {
    port,
    startPackager,
  };
};

export { findDevServerPort };
