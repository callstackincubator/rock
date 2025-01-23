import * as clack from '@clack/prompts';

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

export function spinner() {
  const clackSpinner = clack.spinner();
  return {
    start: (message?: string) => clackSpinner.start(message),
    stop: (message?: string, code?: number) => clackSpinner.stop(message, code),
    message: (message?: string) => clackSpinner.message(message),
  };
}

export function cancelPromptAndExit(message?: string): never {
  clack.cancel(message ?? 'Operation cancelled by user.');
  process.exit(0);
}
