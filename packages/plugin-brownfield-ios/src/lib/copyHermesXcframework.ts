import fs, { existsSync } from 'node:fs';
import path from 'node:path';
import { color, logger, spinner } from '@rnef/tools';

export function copyHermesXcframework({
  iosDir,
  destinationDir,
}: {
  iosDir: string;
  destinationDir: string;
}) {
  const loader = spinner();

  loader.start(`Copying ${color.bold('hermes.xcframework')}`);
  const hermesDestination = path.join(destinationDir, 'hermes.xcframework');

  if (existsSync(hermesDestination)) {
    logger.debug(`Removing old hermes copy`);
    fs.rmSync(hermesDestination, { recursive: true, force: true });
  }

  fs.cpSync(
    path.join(
      iosDir,
      'Pods/hermes-engine/destroot/Library/Frameworks/universal/hermes.xcframework'
    ),
    hermesDestination,
    { recursive: true, force: true }
  );

  loader.stop(`Copied ${color.bold('hermes.xcframework')}`);
}
