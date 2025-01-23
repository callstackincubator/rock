import { cancel, isCancel } from '@clack/prompts';

export function cancelPromptAndExit(message?: string) {
  cancel(message ?? 'Operation cancelled by the user.');
  process.exit(0);
}

export function checkCancelPrompt<T>(value: T | symbol) {
  if (isCancel(value)) {
    cancelPromptAndExit();
  }

  return value as T;
}
