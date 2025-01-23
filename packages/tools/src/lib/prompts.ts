import type { MultiSelectOptions, SelectOptions } from '@clack/prompts';
import * as clack from '@clack/prompts';

export function intro(title?: string) {
  return clack.intro(title);
}

export function outro(message?: string) {
  return clack.outro(message);
}

export async function promptSelect<T>(options: SelectOptions<T>): Promise<T> {
  const result = await clack.select<T>(options);
  if (clack.isCancel(result)) {
    cancelPromptAndExit();
  }

  return result;
}

export async function promptMultiselect<T>(
  options: MultiSelectOptions<T>
): Promise<T[]> {
  const result = await clack.multiselect<T>(options);
  if (clack.isCancel(result)) {
    cancelPromptAndExit();
  }

  return result;
}

export function cancelPromptAndExit(message?: string): never {
  clack.cancel(message ?? 'Operation cancelled by user.');
  process.exit(0);
}

export function checkCancelPrompt<T>(value: unknown) {
  if (clack.isCancel(value)) {
    cancelPromptAndExit();
  }

  return value as T;
}
