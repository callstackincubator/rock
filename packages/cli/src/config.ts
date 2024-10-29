import loadConfig from '@react-native-community/cli-config';
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

export const logConfig = (options: { platform?: string }) => {
  console.log(
    JSON.stringify(
      filterConfig(
        loadConfig.default({
          selectedPlatform: options.platform,
        })
      ),
      null,
      2
    )
  );
};
