import path from 'path';
import { XcodeProjectInfo } from '../types/index.js';

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
      // TODO: raise a warning that probably Pods are not installed or CLI is looking in the wrong directory
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
