import { AndroidProjectConfig } from '@react-native-community/cli-types';
import { runGradle } from '../runGradle.js';
import { promptForTaskSelection } from '../listAndroidTasks.js';
import { intro, outro } from '@clack/prompts';
import { logger } from '@callstack/rnef-tools';

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
  normalizeArgs(args);
  intro('Building Android app.');
  let selectedTask: string | undefined;

  if (args.interactive) {
    selectedTask = await promptForTaskSelection(
      'bundle',
      androidProject.sourceDir
    );
  }

  await runGradle({ taskType: 'bundle', androidProject, args, selectedTask });
  outro('Success.');
}

function normalizeArgs(args: BuildFlags) {
  if (args.tasks && args.mode) {
    logger.warn(
      'Both "--tasks" and "--mode" parameters were passed. Using "--tasks" for building the app.'
    );
  }
}

export const options = [
  {
    name: '-m --mode <string>',
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
