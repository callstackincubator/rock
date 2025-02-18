import { logger } from '@rnef/tools';
import color from 'picocolors';

const npxBin = 'npx rnef';

const checkDeprecatedCommand = (
  argv: string[],
  oldCmd: string,
  newCmd: string,
  deprecatedFlags: Array<{ old: string; new: string }>
) => {
  if (argv.includes(oldCmd)) {
    const args = argv.slice(argv.indexOf(oldCmd) + 1);
    const formattedFlags = getFormattedFlagsArray(deprecatedFlags, args);

    logger.error(`The "${oldCmd}" command was renamed to "${newCmd}".`);

    if (formattedFlags.length > 0) {
      logFlagsAndCommand(formattedFlags, newCmd, args);
    }
    process.exit(1);
  }
};

const checkCurrentCommand = (
  argv: string[],
  cmd: string,
  deprecatedFlags: Array<{ old: string; new: string }>
) => {
  if (argv.includes(cmd)) {
    const args = argv.slice(argv.indexOf(cmd) + 1);
    const formattedFlags = getFormattedFlagsArray(deprecatedFlags, args);

    if (formattedFlags.length > 0) {
      logFlagsAndCommand(formattedFlags, cmd, args);
      process.exit(1);
    }
  }
};

function getFormattedFlagsArray(
  flags: { old: string; new: string }[],
  args: string[]
) {
  return flags
    .map(({ old, new: newFlag }) =>
      args.includes(old) ? `"${old}" changed to "${newFlag}"` : undefined
    )
    .filter(Boolean) as string[];
}

function logFlagsAndCommand(
  formattedFlags: string[],
  cmd: string,
  args: string[]
) {
  logger.error(`Found deprecated flags:
${formattedFlags.join('\n')}`);

  logger.error(
    `Use new command${formattedFlags ? ' with new flags' : ''}:
  ${color.bold(npxBin)} ${color.bold(cmd)} ${color.bold(args.join(' '))}`
  );
}

const deprecatedAndroidFlags = [
  { old: '--mode', new: '--variant' },
  { old: '--appId', new: '--app-id' },
  { old: '--appIdSuffix', new: '--app-id-suffix' },
];

const deprecatedIosFlags = [
  { old: '--mode', new: '--configuration' },
  { old: '--buildFolder', new: '--build-folder' },
  { old: '--destination', new: '--destinations' },
];

export const checkDeprecatedOptions = (argv: string[]) => {
  // Check deprecated commands
  checkDeprecatedCommand(
    argv,
    'run-android',
    'run:android',
    deprecatedAndroidFlags
  );
  checkDeprecatedCommand(argv, 'run-ios', 'run:ios', deprecatedIosFlags);

  // Check current commands for deprecated flags
  checkCurrentCommand(argv, 'run:android', deprecatedAndroidFlags);
  checkCurrentCommand(argv, 'run:ios', deprecatedIosFlags);
};
