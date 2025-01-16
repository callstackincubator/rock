import { outro, spinner } from '@clack/prompts';
import type { AndroidProjectConfig } from '@react-native-community/cli-types';
import { logger, parseArgs } from '@rnef/tools';
import color from 'picocolors';
import { promptForTaskSelection } from '../listAndroidTasks.js';
import { findOutputFile } from '../runAndroid/tryInstallAppOnDevice.js';
import { runGradle } from '../runGradle.js';
import { toPascalCase } from '../toPascalCase.js';

export interface BuildFlags {
  mode: string;
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

  const tasks = args.interactive
    ? [await promptForTaskSelection('bundle', androidProject.sourceDir)]
    : [...(args.tasks ?? []), `bundle${toPascalCase(args.mode)}`];

  await runGradle({ tasks, androidProject, args });

  const outputFilePath = await findOutputFile(androidProject, tasks);

  if (outputFilePath) {
    const loader = spinner();
    loader.start('');
    loader.stop(`Build output: ${color.cyan(outputFilePath)}`);
  }
  outro('Success 🎉.');
}

function normalizeArgs(args: BuildFlags) {
  if (args.tasks && args.mode) {
    logger.warn(
      'Both "--tasks" and "--mode" parameters were passed. Using "--tasks" for building the app.'
    );
  }
  if (!args.mode) {
    args.mode = 'debug';
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
    parse: (val: string) => parseArgs(val),
  },
  {
    name: '-i --interactive',
    description:
      'Explicitly select build type and flavour to use before running a build',
  },
];
