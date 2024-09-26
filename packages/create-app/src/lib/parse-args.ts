import minimist from 'minimist';

export type CliOptions = {
  projectName?: string;
  help?: boolean;
  version?: boolean;
  dir?: string;
  override?: boolean;
};

export function parseCliOptions(argv: string[]): CliOptions {
  const options = minimist<CliOptions>(argv, {
    alias: { h: 'help', d: 'dir', v: 'version' },
  });

  return {
    projectName: options._[0],
    help: options.help,
    version: options.version,
    dir: options.dir,
    override: options.override,
  };
}
