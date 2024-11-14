import { cancel, isCancel } from '@clack/prompts';
import logger from './logger.js';

export function cancelPromptAndExit(message?: string) {
  cancel(message ?? 'Operation cancelled.');
  process.exit(0);
}

export function checkCancelPrompt<T>(value: unknown) {
  if (isCancel(value)) {
    cancelPromptAndExit();
  }

  return value as T;
}

export function spinnerMock() {
  return {
    start: (message: string) => logger.log(message),
    stop: (message: string, code?: number) => {
      if (code !== undefined) {
        logger.error(message);
      }
      logger.log(message);
    },
    message: (message: string) => logger.log(message),
  };
}
