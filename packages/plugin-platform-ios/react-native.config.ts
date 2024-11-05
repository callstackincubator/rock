let ios;
try {
  ios = await import('@react-native-community/cli-config-apple');
} catch {
  console.warn(
    "@react-native-community/cli-config-apple not found, we couldn't configure the iOS project"
  );
}

export default {
  platforms: {
    ios: {
      projectConfig: ios?.getProjectConfig?.({ project: 'ios' }),
      dependencyConfig: ios?.getDependencyConfig?.({ project: 'ios' }),
    },
  },
};
