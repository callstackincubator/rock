import * as clack from '@clack/prompts';
import { updateClock } from './clock.js';
import { isInteractive } from './isInteractive.js';
import logger from './logger.js';

export function intro(title?: string) {
  return clack.intro(title);
}

export function outro(message?: string) {
  return clack.outro(message);
}

export function note(message?: string, title?: string) {
  return clack.note(message, title);
}

export async function promptText(options: clack.TextOptions): Promise<string> {
  const result = await clack.text(options);
  if (clack.isCancel(result)) {
    cancelPromptAndExit();
  }

  return result;
}

export async function promptSelect<T>(
  options: clack.SelectOptions<T>
): Promise<T> {
  const result = await clack.select<T>(options);
  if (clack.isCancel(result)) {
    cancelPromptAndExit();
  }

  return result;
}

export async function promptMultiselect<T>(
  options: clack.MultiSelectOptions<T>
): Promise<T[]> {
  const result = await clack.multiselect<T>(options);
  if (clack.isCancel(result)) {
    cancelPromptAndExit();
  }

  return result;
}

export async function promptGroup<T>(
  prompts: clack.PromptGroup<T>,
  options?: clack.PromptGroupOptions<T> | undefined
) {
  const result = await clack.group(prompts, options);
  if (clack.isCancel(result)) {
    cancelPromptAndExit();
  }

  return result;
}

export type SpinnerOptions = {
  kind?: 'clock' | 'dots';
};

export function spinner() {
  if (!isInteractive()) {
    return {
      start: (message?: string) => logger.log(message),
      stop: (message?: string, code?: number) => logger.log(message, code),
      message: (message?: string) => logger.log(message),
    };
  }

  const clackSpinner = clack.spinner();
  let clockInterval: NodeJS.Timeout | undefined;

  return {
    start: (message?: string, options?: SpinnerOptions) => {
      clackSpinner.start(message);

      if (options?.kind === 'clock' && message) {
        clockInterval = updateClock((m) => clackSpinner.message(m), message);
      }
    },
    stop: (message?: string, code?: number) => {
      clackSpinner.stop(message, code);

      if (clockInterval) {
        clearInterval(clockInterval);
        clockInterval = undefined;
      }
    },
    message: (message?: string, options?: SpinnerOptions) => {
      clackSpinner.message(message);

      if (clockInterval) {
        clearInterval(clockInterval);
        clockInterval = undefined;
      }

      if (options?.kind === 'clock' && message) {
        clockInterval = updateClock((m) => clackSpinner.message(m), message);
      }
    },
  };
}

export function cancelPromptAndExit(message?: string): never {
  clack.cancel(message ?? 'Operation cancelled by user.');
  process.exit(0);
}
