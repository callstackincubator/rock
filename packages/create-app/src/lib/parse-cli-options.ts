import minimist from 'minimist';

export type CliOptions = {
  name?: string;
  template?: string;
  platform?: string[];
  help?: boolean;
  version?: boolean;
  dir?: string;
  override?: boolean;
};

export function parseCliOptions(argv: string[]): CliOptions {
  const options = minimist<CliOptions>(argv, {
    alias: { h: 'help', v: 'version', p: 'platform', t: 'template', d: 'dir' },
  });

  return {
    name: options._[0],
    template: options.template,
    platform: options.platform,
    help: options.help,
    version: options.version,
    dir: options.dir,
    override: options.override,
  };
}
