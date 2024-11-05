import { loadConfigAsync } from '@react-native-community/cli-config';
import { Config, DependencyConfig } from '@react-native-community/cli-types';

function isValidRNDependency(config: DependencyConfig) {
  return (
    Object.keys(config.platforms).filter((key) =>
      Boolean(config.platforms[key])
    ).length !== 0
  );
}

function filterConfig(config: Config) {
  const filtered = { ...config };
  Object.keys(filtered.dependencies).forEach((item) => {
    if (!isValidRNDependency(filtered.dependencies[item])) {
      delete filtered.dependencies[item];
    }
  });
  return filtered;
}

export const logConfig = async (options: { platform?: string }) => {
  const config = await loadConfigAsync({
    selectedPlatform: options.platform,
  });

  console.log(JSON.stringify(filterConfig(config), null, 2));
};
