import logger from '../logger.js';
import { promptConfirm } from '../prompts.js';
import getNextPort from './getNextPort.js';
import { logAlreadyRunningBundler } from './logAlreadyRunningBundler.js';

export const handlePortUnavailable = async (
  initialPort: number,
  projectRoot: string,
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
      logger.info(
        'Exiting. You can try again with a different port using "--port" flag',
      );
    }
  }

  return { port, startDevServer };
};

const askForPortChange = (port: number, nextPort: number) => {
  logger.info(`Another process is running on port ${port}.`);

  return promptConfirm({
    message: `Use port ${nextPort} instead?`,
    confirmLabel: 'Yes',
    cancelLabel: 'No',
  });
};
