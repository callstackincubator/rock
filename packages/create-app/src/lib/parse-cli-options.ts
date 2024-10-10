import minimist from 'minimist';

export type CliOptions = {
  name?: string;
  template?: string;
  platforms?: string[];
  help?: boolean;
  version?: boolean;
  dir?: string;
  override?: boolean;
};

type MinimistOptions = {
  help?: boolean;
  version?: boolean;
  override?: boolean;
  dir?: string;
  template?: string;
  platform?: string | string[];
};

export function parseCliOptions(argv: string[]): CliOptions {
  const options = minimist<MinimistOptions>(argv, {
    alias: { h: 'help', v: 'version', p: 'platform', t: 'template', d: 'dir' },
    boolean: ['help', 'version', 'override'],
    string: ['template', 'platform', 'dir'],
  });

  return {
    name: options._[0],
    template: ensureOptionalString(options.template),
    platforms: ensureOpitonalArray(options.platform),
    help: options.help,
    version: options.version,
    dir: ensureOptionalString(options.dir),
    override: options.override,
  };
}

function ensureOptionalString(
  value: string | string[] | undefined
): string | undefined {
  if (value == undefined) {
    return undefined;
  }

  // Last element of the array wins
  return Array.isArray(value) ? value[value.length - 1] : value;
}

function ensureOpitonalArray<T>(value: T | T[] | undefined): T[] | undefined {
  if (value == undefined) {
    return undefined;
  }

  return Array.isArray(value) ? value : [value];
}
