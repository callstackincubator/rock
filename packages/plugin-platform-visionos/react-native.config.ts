import {
  getProjectConfig,
  getDependencyConfig,
} from '@react-native-community/cli-config-apple';

export default {
  platforms: {
    visionos: {
      projectConfig: getProjectConfig({ platformName: 'visionos' }),
      dependencyConfig: getDependencyConfig({ platformName: 'visionos' }),
    },
  },
};
