import { logger } from '@rnef/tools';
import color from 'picocolors';

const binEntry = 'rnef';

const checkDeprecatedCommand = (argv: string[], oldCmd: string, newCmd: string, deprecatedFlags: Array<{ old: string, new: string }>) => {
  if (argv.includes(oldCmd)) {
    const index = argv.indexOf(oldCmd);
    let args = argv.slice(index + 1);
    
    logger.warn(`⚠️ Deprecated command "${oldCmd}" detected.`);
    
    deprecatedFlags.forEach(({ old, new: newFlag }) => {
      if (args.includes(old)) {
        logger.warn(
          `⚠️ Deprecated flag "${old}" detected in "${oldCmd}" command. Please migrate to "${newFlag}".`
        );
        args = args.map(arg => arg === old ? newFlag : arg);
      }
    });

    logger.info(`Use: ${color.bold(binEntry)} ${color.bold(newCmd)} ${color.bold(args.join(' '))}`);
    process.exit(1);
  }
};

const checkCurrentCommand = (argv: string[], cmd: string, deprecatedFlags: Array<{ old: string, new: string }>) => {
  if (argv.includes(cmd)) {
    let args = argv.slice(argv.indexOf(cmd) + 1);
    let hasDeprecatedFlags = false;
    
    deprecatedFlags.forEach(({ old, new: newFlag }) => {
      if (args.includes(old)) {
        hasDeprecatedFlags = true;
        logger.warn(
          `⚠️ Deprecated flag "${old}" detected for "${cmd}". Please migrate to "${newFlag}".`
        );
        args = args.map(arg => arg === old ? newFlag : arg);
      }
    });
    
    if (hasDeprecatedFlags) {
      logger.info(`Use: ${color.bold(binEntry)} ${color.bold(cmd)} ${color.bold(args.join(' '))}`);
      process.exit(1);
    }
  }
};

export const checkDeprecatedOptions = (argv: string[]) => {
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

  // Check deprecated commands
  checkDeprecatedCommand(argv, 'run-android', 'run:android', deprecatedAndroidFlags);
  checkDeprecatedCommand(argv, 'run-ios', 'run:ios', deprecatedIosFlags);

  // Check current commands for deprecated flags
  checkCurrentCommand(argv, 'run:android', deprecatedAndroidFlags);
  checkCurrentCommand(argv, 'run:ios', deprecatedIosFlags);
};
