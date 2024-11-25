import { select } from '@clack/prompts';

export async function promptForSchemeSelection(
  schemes: string[]
): Promise<string> {
  const scheme = await select({
    message: 'Select the scheme you want to use',
    options: schemes.map((value) => ({
      label: value,
      value: value,
    })),
  });

  return scheme as string;
}

export async function promptForConfigurationSelection(
  configurations: string[]
): Promise<string> {
  const configuration = await select({
    message: 'Select the configuration you want to use',
    options: configurations.map((value) => ({
      label: value,
      value: value,
    })),
  });

  return configuration as string;
}
