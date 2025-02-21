import type { SupportedRemoteCacheProviders } from '@rnef/tools';
import minimist from 'minimist';

export type CliOptions = {
  name?: string;
  template?: string;
  platforms?: string[];
  plugins?: string[];
  help?: boolean;
  version?: boolean;
  dir?: string;
  override?: boolean;
  remoteCacheProvider?: SupportedRemoteCacheProviders | undefined | false;
};

type MinimistOptions = {
  help?: boolean;
  version?: boolean;
  override?: boolean;
  dir?: string;
  template?: string;
  platform?: string | string[];
  plugin?: string | string[];
  'remote-cache-provider'?: string | boolean;
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
    plugins: ensureOpitonalArray(options.plugin),
    help: options.help,
    version: options.version,
    dir: ensureOptionalString(options.dir),
    override: options.override,
    remoteCacheProvider: options['remote-cache-provider'] as
      | SupportedRemoteCacheProviders
      | undefined
      | false,
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
