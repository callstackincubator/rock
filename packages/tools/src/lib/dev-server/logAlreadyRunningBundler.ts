import logger from '../logger.js';

export const logAlreadyRunningBundler = (port: number) => {
  logger.info(
    `A dev server is already running for this project on port ${port}. Pass "--port" option to use a different port`,
  );
};
