import logger from '../logger.js';
import { promptConfirm } from '../prompts.js';

export const askForPortChange = async (port: number, nextPort: number) => {
  logger.info(`Another process is running on port ${port}.`);

  return await promptConfirm({
    message: `Use port ${nextPort} instead?`,
    confirmLabel: 'Yes',
    cancelLabel: 'No',
  });
};

export const logAlreadyRunningBundler = (port: number) => {
  logger.info(
    `A dev server is already running for this project on port ${port}, pass "--port" option to use a different port`
  );
};

export const logChangePortInstructions = () => {
  logger.info(
    'Please terminate this process and try again, or use another port with "--port".'
  );
};
