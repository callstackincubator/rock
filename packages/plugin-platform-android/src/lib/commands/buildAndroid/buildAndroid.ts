import { AndroidProjectConfig } from '@react-native-community/cli-types';
import { runGradle } from '../runGradle.js';
import { promptForTaskSelection } from '../listAndroidTasks.js';

export interface BuildFlags {
  mode?: string;
  activeArchOnly?: boolean;
  tasks?: Array<string>;
  extraParams?: Array<string>;
  interactive?: boolean;
}

export async function buildAndroid(
  androidProject: AndroidProjectConfig,
  args: BuildFlags
) {
  let selectedTask: string | undefined;

  if (args.interactive) {
    selectedTask = await promptForTaskSelection(
      'bundle',
      androidProject.sourceDir
    );
  }

  return runGradle({ taskType: 'bundle', androidProject, args, selectedTask });
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
