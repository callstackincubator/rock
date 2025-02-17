import { logger } from '@rnef/tools';

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

  if (argv.includes('run:android')) {
    deprecatedAndroidFlags.forEach(({ old, new: newFlag }) => {
      if (argv.includes(old)) {
        logger.warn(
          `⚠️ Deprecated flag "${old}" detected for "run:android". Please migrate to "${newFlag}".`
        );
        process.exit(1);
      }
    });
  }

  if (argv.includes('run:ios')) {
    deprecatedIosFlags.forEach(({ old, new: newFlag }) => {
      if (argv.includes(old)) {
        logger.warn(
          `⚠️ Deprecated flag "${old}" detected for "run:ios". Please migrate to "${newFlag}".`
        );
        process.exit(1);
      }
    });
  }

  if (argv.includes('run-android')) {
    logger.warn(
      `⚠️ Deprecated command "run-android" detected. Please migrate to "run:android".`
    );
    process.exit(1);
  }

  if (argv.includes('run-ios')) {
    logger.warn(
      `⚠️ Deprecated command "run-ios" detected. Please migrate to "run:ios".`
    );
    process.exit(1);
  }
};
