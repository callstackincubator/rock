import type { PluginApi } from '@rnef/config';
import { logger } from '@rnef/tools';

export async function runHermesByPlatform({
  platform,
  bundleOutput,
  api,
}: {
  platform: string;
  bundleOutput: string;
  api: PluginApi;
}) {
  // Hermes compiler is distributed separately per-platform.
  switch (platform) {
    case 'ios': {
      const { runHermes } = await import('@rnef/platform-ios');
      await runHermes({ bundleOutputPath: bundleOutput });
      break;
    }
    case 'android': {
      const { runHermes } = await import('@rnef/platform-android');
      await runHermes({ bundleOutputPath: bundleOutput });
      break;
    }
    default: {
      if (platform) {
        // @ts-expect-error todo fix
        const platformName = platforms[platform](api).name;
        const { runHermes } = await import(platformName);
        if (runHermes) {
          await runHermes({ bundleOutputPath: bundleOutput });
        } else {
          logger.warn(
            `No "runHermes" function exported from for the "${platformName}" platform.`
          );
        }
      } else {
        return;
      }
    }
  }
}
