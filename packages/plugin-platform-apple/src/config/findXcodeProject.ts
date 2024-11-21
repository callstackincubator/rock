import path from 'path';
import { XcodeProjectInfo } from '../types/index.js';
import { logger } from '@callstack/rnef-tools';

function findXcodeProject(files: Array<string>): XcodeProjectInfo | null {
  const sortedFiles = files.sort();

  for (let i = sortedFiles.length - 1; i >= 0; i--) {
    const fileName = files[i];
    const ext = path.extname(fileName);
    const projectPath = path.dirname(fileName);

    if (ext === '.xcworkspace') {
      return {
        name: fileName,
        path: projectPath,
        isWorkspace: true,
      };
    }
    if (ext === '.xcodeproj') {
      logger.warn(
        "We couldn't find `.xcworkspace` file in your project, please make sure that you have Cocoapods installed, outdated or missing Pods can cause various build issues."
      );
      return {
        name: fileName,
        path: projectPath,
        isWorkspace: false,
      };
    }
  }

  return null;
}

export default findXcodeProject;
