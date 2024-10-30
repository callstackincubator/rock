let ios;
try {
  ios = require('@react-native-community/cli-config-apple');
} catch {
  console.warn(
    '@react-native-community/cli-config-apple not found, the react-native.config.js may be unusable.'
  );
}

module.exports = {
  platforms: {
    ios: {
      projectConfig: ios?.getProjectConfig({ project: 'ios' }),
      dependencyConfig: ios?.getDependencyConfig({ project: 'ios' }),
    },
  },
};
