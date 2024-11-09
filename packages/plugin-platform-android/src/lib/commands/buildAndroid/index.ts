import { logger } from '@react-native-community/cli-tools';
import { Config } from '@react-native-community/cli-types';
import spawn from 'nano-spawn';
import { getAndroidProject } from '@react-native-community/cli-config-android';
import { getCPU, getDevices } from './adb.js';
import { getTaskNames } from './getTaskNames.js';
import { promptForTaskSelection } from './listAndroidTasks.js';
import { spinner } from '@clack/prompts';

export interface BuildFlags {
  mode?: string;
  activeArchOnly?: boolean;
  tasks?: Array<string>;
  extraParams?: Array<string>;
  interactive?: boolean;
}

export async function buildAndroid(config: Config, args: BuildFlags) {
  const androidProject = getAndroidProject(config);

  if (args.tasks && args.mode) {
    logger.warn(
      'Both "tasks" and "mode" parameters were passed to "build" command. Using "tasks" for building the app.'
    );
  }

  let { tasks } = args;

  if (args.interactive) {
    const selectedTask = await promptForTaskSelection(
      'build',
      androidProject.sourceDir
    );
    if (selectedTask) {
      tasks = [selectedTask];
    }
  }

  const gradleArgs = getTaskNames(
    androidProject.appName,
    args.mode,
    tasks,
    'bundle'
  );

  if (args.extraParams) {
    gradleArgs.push(...args.extraParams);
  }

  if (args.activeArchOnly) {
    const devices = getDevices();
    const architectures = devices
      .map((device) => {
        return getCPU(device);
      })
      .filter(
        (arch, index, array) => arch != null && array.indexOf(arch) === index
      );
    if (architectures.length > 0) {
      logger.info(`Detected architectures ${architectures.join(', ')}`);
      gradleArgs.push('-PreactNativeArchitectures=' + architectures.join(','));
    }
  }

  return build(gradleArgs, androidProject.sourceDir);
}

export async function build(gradleArgs: string[], sourceDir: string) {
  const loader = spinner();
  const cmd = process.platform.startsWith('win') ? 'gradlew.bat' : './gradlew';
  loader.start('Building the app');
  try {
    await spawn(cmd, gradleArgs, {
      stdio: 'inherit',
      cwd: sourceDir,
    });
    loader.stop('Build successful.');
  } catch (error) {
    loader.stop(`Failed to build the app. ${error}`, 1);
  }
}

export const options = [
  {
    name: '--mode <string>',
    description: "Specify your app's build variant",
  },
  {
    name: '--tasks <list>',
    description:
      'Run custom Gradle tasks. By default it\'s "assembleDebug". Will override passed mode and variant arguments.',
    parse: (val: string) => val.split(','),
  },
  {
    name: '--active-arch-only',
    description:
      'Build native libraries only for the current device architecture for debug builds.',
    default: false,
  },
  {
    name: '--extra-params <string>',
    description: 'Custom params passed to gradle build command',
    parse: (val: string) => val.split(' '),
  },
  {
    name: '-i --interactive',
    description:
      'Explicitly select build type and flavour to use before running a build',
  },
];

export default {
  name: 'build-android',
  description: 'builds your app',
  func: buildAndroid,
  options,
};
