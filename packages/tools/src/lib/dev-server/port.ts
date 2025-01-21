import { select } from "@clack/prompts";
import logger from "../logger.js";

export const askForPortChange = async (port: number, nextPort: number) => {
  logger.info(`Another process is running on port ${port}.`);

  const result = await select({
    message: `Use port ${nextPort} instead?`,
    options: [
      {
        value: true,
        label: 'Yes',
      },
      {
        value: false,
        label: 'No',
      },
    ],
  })
 
  return result === true;
};

export const logAlreadyRunningBundler = (port: number) => {
  logger.info(
    `A dev server is already running for this project on port ${port}, pass "--port" option to use a different port`,
  );
};

export const logChangePortInstructions = () => {
  logger.info(
    'Please terminate this process and try again, or use another port with "--port".',
  );
};
