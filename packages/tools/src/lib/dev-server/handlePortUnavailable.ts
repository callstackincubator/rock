import getNextPort from './getNextPort.js';
import {
  askForPortChange,
  logAlreadyRunningBundler,
  logChangePortInstructions,
} from './port.js';

export const handlePortUnavailable = async (
  initialPort: number,
  projectRoot: string
): Promise<{
  port: number;
  startDevServer: boolean;
}> => {
  const { nextPort, start } = await getNextPort(initialPort, projectRoot);
  let startDevServer = true;
  let port = initialPort;

  if (!start) {
    startDevServer = false;
    logAlreadyRunningBundler(nextPort);
  } else {
    const change = await askForPortChange(port, nextPort);

    if (change) {
      port = nextPort;
    } else {
      startDevServer = false;
      logChangePortInstructions();
    }
  }

  return { port, startDevServer };
};
