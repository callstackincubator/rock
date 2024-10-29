import { getProjectConfig } from '../config/index.js';
import { ApplePlatform, ProjectConfig } from '../types/index.js';

const getPlatformConfig = (
  platformName: ApplePlatform
): ProjectConfig | null => {
  // TODO: add ability to pass in a custom user config
  const userConfig = {
    sourceDir: 'ios',
  };

  return getProjectConfig(platformName, process.cwd(), userConfig);
};

export default getPlatformConfig;
