const linkModules = () => {
  console.log('link modules');
};
const linkAssets = () => {
  console.log('link assets');
};

const build = (args) => {
  linkModules(); // -> rnc-cli config --platform android
  linkAssets(); // -> logic react-native-assets, specific to android
  // args.bundler.build()
  // nativeAndroidBuild()
  console.log('build', { args });
};

const run = (args) => {
  linkModules();
  linkAssets();
  console.log('run', { args });
};

const buildOptions = [
  {
    name: '--port',
    description: 'Port to run on',
    defaultValue: 8080,
  },
  {
    name: '--remote',
    description: 'remote build',
  },
];

export const PlatformAndroid = () => (api) => {
  api.registerCommand({
    name: 'android:build',
    description: 'Build android',
    action: build,
    options: buildOptions,
  });

  api.registerCommand({
    name: 'android:run',
    description: 'Run android',
    action: run,
    options: buildOptions,
  });

  return {
    name: 'platform-android',
    description: 'test plugin for everything android.',
  };
};

export default PlatformAndroid;
