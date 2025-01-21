import getNextPort from './getNextPort.js';
import {
  askForPortChange,
  logAlreadyRunningBundler,
  logChangePortInstructions,
} from './port.js';

const handlePortUnavailable = async (
  initialPort: number,
  projectRoot: string,
): Promise<{
  port: number;
  packager: boolean;
}> => {
  const {nextPort, start} = await getNextPort(initialPort, projectRoot);
  let packager = true;
  let port = initialPort;

  if (!start) {
    packager = false;
    logAlreadyRunningBundler(nextPort);
  } else {
    const change = await askForPortChange(port, nextPort);

    if (change) {
      port = nextPort;
    } else {
      packager = false;
      logChangePortInstructions();
    }
  }

  return {
    port,
    packager,
  };
};

export default handlePortUnavailable;
