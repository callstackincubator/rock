// @ts-nocheck
// copied from getConfig.ts -- todo refactor to separate package
import * as path from 'node:path';

type PlatformConfig = {
  name: string;
  init: () => Promise<void>;
  build: () => Promise<void>;
  run: () => Promise<void>;
  linkModules: () => Promise<void>;
  linkAssets: () => Promise<void>;
};

type PluginOutput = {
  name: string;
  description: string;
  action: () => Promise<void>;
  platform?: () => PlatformConfig;
};

type PluginApi = {
  registerCommand: (command: CommandType) => void;
};

type Config = {
  variant: string;
};

type CommandType = {
  name: string;
  description: string;
  action: (args: unknown) => void;
};

const linkModules = () => {
  // noop
  console.log('link modules');
};
const linkAssets = () => {
  console.log('link assets');
};

const build = (args) => {
  linkModules();
  linkAssets();
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

const pluginPlatformAndroid =
  (config: Config) =>
  (api: PluginApi): PluginOutput => {
    api.registerCommand({
      name: 'xplat:build',
      description: 'Build xplat',
      action: build,
      options: buildOptions,
    });

    api.registerCommand({
      name: 'xplat:run',
      description: 'Run xplat',
      action: run,
      options: buildOptions,
    });

    return {
      name: 'sample-plugin',
      description: 'sample plugin',
      action: () => {},
    };
  };

// export const editTemplate = () => {
//   // init template
// };

export default pluginPlatformAndroid;

export const getTemplateInfo = () => {
  return {
    name: 'android',
    templatePath: path.join(__dirname, '../template'),
    editTemplate: () => {
      // init
    },
  };
};
