import {
  getDependencyConfig,
  getProjectConfig,
} from '@react-native-community/cli-config-apple';

export default {
  platforms: {
    ios: {
      projectConfig: getProjectConfig({ platformName: 'ios' }),
      dependencyConfig: getDependencyConfig({ platformName: 'ios' }),
    },
    macos: {
      projectConfig: getProjectConfig({ platformName: 'macos' }),
      dependencyConfig: getDependencyConfig({ platformName: 'macos' }),
      npmPackageName: 'react-native-macos'
    },
  },
};
