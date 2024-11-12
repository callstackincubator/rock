import { Config } from '@react-native-community/cli-types';
import { getAndroidProject } from '@react-native-community/cli-config-android';
import { runGradle } from '../runGradle.js';
import { promptForTaskSelection } from '../listAndroidTasks.js';

export interface BuildFlags {
  mode?: string;
  activeArchOnly?: boolean;
  tasks?: Array<string>;
  extraParams?: Array<string>;
  interactive?: boolean;
}

export async function buildAndroid(config: Config, args: BuildFlags) {
  const androidProject = getAndroidProject(config);
  let selectedTask: string | undefined;

  if (args.interactive) {
    selectedTask = await promptForTaskSelection(
      'build',
      androidProject.sourceDir
    );
  }

  return runGradle({ taskType: 'build', androidProject, args, selectedTask });
}

export const options = [
  {
    name: '--mode <string>',
    description: "Specify your app's build variant",
  },
  {
    name: '--tasks <list>',
    description:
      'Run custom Gradle tasks. By default it\'s "assembleDebug". Will override passed mode argument.',
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
