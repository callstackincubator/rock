import fs, { existsSync } from 'node:fs';
import path from 'node:path';
import { color, logger, spinner } from '@rock-js/tools';

export function copyReactXcframeworks({
  sourceDir,
  destinationDir,
}: {
  sourceDir: string;
  destinationDir: string;
}) {
  const react = 'React.xcframework';
  const reactNativeDependencies = 'ReactNativeDependencies.xcframework';
  const loader = spinner();

  const reactFrameworkSource = path.join(
    sourceDir,
    `Pods/React-Core-prebuilt/${react}`,
  );

  const reactNativeDepsSource = path.join(
    sourceDir,
    `Pods/ReactNativeDependencies/framework/packages/react-native/${reactNativeDependencies}`,
  );

  if (existsSync(reactFrameworkSource)) {
    loader.start(`Copying ${color.bold(react)}`);
    const reactDestination = path.join(destinationDir, react);

    if (existsSync(reactDestination)) {
      logger.debug(`Removing old ${react} copy`);
      fs.rmSync(reactDestination, { recursive: true, force: true });
    }

    fs.cpSync(reactFrameworkSource, reactDestination, {
      recursive: true,
      force: true,
    });

    loader.stop(`Copied ${color.bold(react)}`);
  }

  if (existsSync(reactNativeDepsSource)) {
    loader.start(`Copying ${color.bold(reactNativeDependencies)}`);

    const reactNativeDepsDestination = path.join(
      destinationDir,
      reactNativeDependencies,
    );

    if (existsSync(reactNativeDepsDestination)) {
      logger.debug(`Removing old ${reactNativeDependencies} copy`);
      fs.rmSync(reactNativeDepsDestination, { recursive: true, force: true });
    }

    fs.cpSync(reactNativeDepsSource, reactNativeDepsDestination, {
      recursive: true,
      force: true,
    });

    loader.stop(`Copied ${color.bold(reactNativeDependencies)}`);
  }
}
