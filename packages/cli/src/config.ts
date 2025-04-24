import type {
  Config,
  DependencyConfig,
} from '@react-native-community/cli-types';
import type { ConfigOutput } from '@rnef/config';

function isValidRNDependency(config: DependencyConfig) {
  return (
    Object.keys(config.platforms).filter((key) =>
      Boolean(config.platforms[key])
    ).length !== 0
  );
}

function filterConfig(config: Config) {
  const filtered = { ...config };
  // `react-native` is not a dependency. When loading it through community CLI it's not an issue,
  // but in our case we don't install `@react-native-community/cli-platform-*` as a dependencies
  // so the config.platforms key is empty, which makes autolinking treat it as a dependency.
  delete filtered.dependencies['react-native'];
  Object.keys(filtered.dependencies).forEach((item) => {
    if (!isValidRNDependency(filtered.dependencies[item])) {
      delete filtered.dependencies[item];
    }
  });
  return filtered;
}

export const logConfig = async (
  args: { platform?: string },
  ownConfig: ConfigOutput
) => {
  const { loadConfigAsync } = await import(
    '@react-native-community/cli-config'
  );
  const config = await loadConfigAsync({
    projectRoot: ownConfig.root,
    selectedPlatform: args.platform,
  });

  const platforms =
    ownConfig.platforms && args.platform
      ? { [args.platform]: ownConfig.platforms[args.platform] }
      : ownConfig.platforms;

  for (const platform in platforms) {
    config.project[platform] = platforms[platform].autolinkingConfig.project;
  }

  console.log(JSON.stringify(filterConfig(config), null, 2));
};
