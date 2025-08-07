import * as clack from '@clack/prompts';
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

export async function promptPassword(
  options: clack.PasswordOptions
): Promise<string> {
  const result = await clack.password(options);
  if (clack.isCancel(result)) {
    cancelPromptAndExit();
  }

  return result;
}

export async function promptSelect<T>(
  options: clack.SelectOptions<T>
): Promise<T> {
  // If there is only one option, return it immediately
  if (options.options.length === 1) {
    return options.options[0].value as T;
  }

  const result = await clack.select<T>(options);
  if (clack.isCancel(result)) {
    cancelPromptAndExit();
  }

  return result;
}

type ConfirmOptions = {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

export async function promptConfirm(options: ConfirmOptions): Promise<boolean> {
  const result = await clack.select({
    message: options.message,
    options: [
      { value: true, label: options.confirmLabel ?? 'Confirm' },
      { value: false, label: options.cancelLabel ?? 'Cancel' },
    ],
  });

  if (clack.isCancel(result)) {
    cancelPromptAndExit();
  }

  return result === true;
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

export function spinner(options?: clack.SpinnerOptions & { silent?: boolean }) {
  if (options?.silent) {
    return {
      start: () => {},
      stop: () => {},
      message: () => {},
    };
  }
  if (logger.isVerbose() || !isInteractive()) {
    return {
      start: (message?: string) => logger.log(formatStartMessage(message)),
      stop: (message?: string, code = 0) => {
        return code === 0 ? logger.log(message) : logger.error(message);
      },
      message: (message?: string) => logger.log(formatStartMessage(message)),
    };
  }

  const clackSpinner = clack.spinner(options);

  return {
    start: (message?: string) => {
      clackSpinner.start(message);
    },
    stop: (message?: string, code?: number) => {
      clackSpinner.stop(message, code);
    },
    message: (message?: string) => {
      clackSpinner.message(message);
    },
  };
}

export function formatStartMessage(
  text: string | undefined
): string | undefined {
  if (text === undefined) {
    return undefined;
  }

  const messageWithoutDots = text.replace(/\.+$/, '');
  return `${messageWithoutDots}...`;
}

export function cancelPromptAndExit(message?: string): never {
  clack.cancel(message ?? 'Operation cancelled by user.');
  process.exit(0);
}
