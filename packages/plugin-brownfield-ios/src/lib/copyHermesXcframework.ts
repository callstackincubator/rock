import fs, { existsSync } from 'node:fs';
import path from 'node:path';
import { color, logger, spinner, versionCompare } from '@rock-js/tools';

export function copyHermesXcframework({
  sourceDir,
  destinationDir,
  reactNativeVersion,
}: {
  sourceDir: string;
  destinationDir: string;
  reactNativeVersion: string;
}) {
  const loader = spinner();
  const hermesFrameworkName =
    versionCompare('0.82.0', reactNativeVersion) >= 0
      ? 'hermesvm.xcframework'
      : 'hermes.xcframework';

  loader.start(`Copying ${color.bold(hermesFrameworkName)}`);
  const hermesDestination = path.join(destinationDir, hermesFrameworkName);

  if (existsSync(hermesDestination)) {
    logger.debug(`Removing old hermes copy`);
    fs.rmSync(hermesDestination, { recursive: true, force: true });
  }

  fs.cpSync(
    path.join(
      sourceDir,
      `Pods/hermes-engine/destroot/Library/Frameworks/universal/${hermesFrameworkName}`,
    ),
    hermesDestination,
    { recursive: true, force: true },
  );

  loader.stop(`Copied ${color.bold(hermesFrameworkName)}`);
}
