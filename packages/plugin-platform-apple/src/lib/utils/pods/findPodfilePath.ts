import { logger } from '@rnef/tools';
import path from 'path';
import type { ApplePlatform } from '../../types/index.js';
import { supportedPlatforms } from './../supportedPlatforms.js';
import findAllPodfilePaths from './findAllPodfilePaths.js';

// Podfile in the bundle package
const BUNDLE_VENDORED_PODFILE = 'vendor/bundle/ruby';

export default function findPodfilePath(
  cwd: string,
  platformName: ApplePlatform
) {
  const podfiles = findAllPodfilePaths(cwd)
    /**
     * Then, we will run a simple test to rule out most example projects,
     * unless they are located in a `platformName` folder
     */
    .filter((project) => {
      if (path.dirname(project) === platformName) {
        // Pick the Podfile in the default project (in the iOS folder)
        return true;
      }

      if (project.indexOf(BUNDLE_VENDORED_PODFILE) > -1) {
        // Ignore the podfile shipped with Cocoapods in bundle
        return false;
      }

      // Accept all the others
      return true;
    })
    /**
     * Podfile from `platformName` folder will be picked up as a first one.
     */
    .sort((project) => (path.dirname(project) === platformName ? -1 : 1));

  const supportedPlatformsArray: string[] = Object.values(supportedPlatforms);
  const containsUnsupportedPodfiles = podfiles.every(
    (podfile) => !supportedPlatformsArray.includes(podfile.split('/')[0])
  );

  if (podfiles.length > 0) {
    if (podfiles.length > 1 && containsUnsupportedPodfiles) {
      logger.warn(`
          Multiple Podfiles were found: ${podfiles}. Choosing ${podfiles[0]} automatically.
          If you would like to select a different one, you can configure it via "project.${platformName}.sourceDir".
          You can learn more about it here: https://github.com/react-native-community/cli/blob/main/docs/configuration.md
        `);
    }
    return path.join(cwd, podfiles[0]);
  }

  return null;
}
