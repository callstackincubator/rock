import type { SelectOptions } from '@clack/prompts';
import { cancel, isCancel, select } from '@clack/prompts';

export async function promptSelect<T>(options: SelectOptions<T>): Promise<T> {
  const result = await select<T>(options);
  if (isCancel(result)) {
    cancelPromptAndExit();
  }

  return result;
}

export function cancelPromptAndExit(message?: string): never {
  cancel(message ?? 'Operation cancelled by user.');
  process.exit(0);
}

export function checkCancelPrompt<T>(value: unknown) {
  if (isCancel(value)) {
    cancelPromptAndExit();
  }

  return value as T;
}
