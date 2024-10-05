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

type CommandType = {
  name: string;
  description: string;
  action: () => void;
};

type PluginArgs = {
  registerCommand: (command: CommandType) => void;
};

export default function SamplePlugin(api: PluginArgs): PluginOutput {
  const name = 'xplat';
  const linkModules = async () => {
    // noop
  };
  const linkAssets = async () => {
    // noop
  };
  const build = async () => {
    linkModules();
    linkAssets();
    // noop - build
  };
  const run = async () => {
    linkModules();
    linkAssets();
    // noop - build
  };

  api.registerCommand({
    name: `${name}build`,
    description: 'Build xplat',
    action: build,
  });

  api.registerCommand({
    name: `${name}run`,
    description: 'Run xplat',
    action: run,
  });

  return {
    name: 'xplat',
    description: 'sample plugin',
    action: async () => {
      // noop
    },
  };
}
