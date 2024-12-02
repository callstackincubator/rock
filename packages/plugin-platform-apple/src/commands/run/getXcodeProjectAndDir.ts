import fs from 'node:fs';
import { findXcodeProject } from '@react-native-community/cli-config-apple';
import { getPlatformInfo } from '../run/getPlatformInfo.js';
import { ApplePlatform, ProjectConfig } from '../../types/index.js';

export function getXcodeProjectAndDir(
  iosProjectConfig: ProjectConfig | undefined,
  platformName: ApplePlatform,
  installedPods?: boolean
) {
  const { readableName: platformReadableName } = getPlatformInfo(platformName);

  if (!iosProjectConfig) {
    throw new Error(
      `${platformReadableName} project folder not found. Make sure that project.${platformName}.sourceDir points to a directory with your Xcode project and that you are running this command inside of React Native project.`
    );
  }

  let { xcodeProject } = iosProjectConfig;
  const sourceDir = iosProjectConfig.sourceDir;

  if (!xcodeProject) {
    throw new Error(
      `Could not find Xcode project files in "${sourceDir}" folder. Please make sure that you have installed Cocoapods and "${sourceDir}" is a valid path`
    );
  }

  // if project is freshly created, revisit Xcode project to verify Pods are installed correctly.
  // This is needed because ctx project is created before Pods are installed, so it might have outdated information.
  if (installedPods) {
    const recheckXcodeProject = findXcodeProject(fs.readdirSync(sourceDir));
    if (recheckXcodeProject) {
      xcodeProject = recheckXcodeProject;
    }
  }

  return { xcodeProject, sourceDir };
}
