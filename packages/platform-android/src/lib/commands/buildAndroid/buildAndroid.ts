import type { AndroidProjectConfig } from '@react-native-community/cli-types';
import { color, logger, outro, parseArgs, spinner } from '@rnef/tools';
import { promptForTaskSelection } from '../listAndroidTasks.js';
import { findOutputFile } from '../runAndroid/findOutputFile.js';
import { runGradle } from '../runGradle.js';
import { toPascalCase } from '../toPascalCase.js';

export interface BuildFlags {
  variant: string;
  aab?: boolean;
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
  // Use assemble task by default, but bundle if the flag is set
  const buildTaskBase = args.aab ? 'bundle' : 'assemble';
  const tasks = args.interactive
    ? [await promptForTaskSelection('bundle', androidProject.sourceDir)]
    : args.tasks ?? [`${buildTaskBase}${toPascalCase(args.variant)}`];

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
  if (args.tasks && args.variant) {
    logger.warn(
      'Both "--tasks" and "--variant" parameters were passed. Using "--tasks" for building the app.'
    );
  }
  if (!args.variant) {
    args.variant = 'debug';
  }
}

export const options = [
  {
    name: '--variant <string>',
    description: `Specify your app's build variant, which is constructed from build type and product flavor, e.g. "debug" or "freeRelease".`,
  },
  {
    name: '--aab',
    description:
      'Produces an Android App Bundle (AAB) suited for app stores such as Google Play. If not set, APK is created.',
  },
  {
    name: '--tasks <list>',
    description:
      'Run custom Gradle tasks. Will override the "--variant" and "--bundle" arguments.',
    parse: (val: string) => val.split(','),
  },
  {
    name: '--active-arch-only',
    description:
      'Build native libraries only for the current device architecture. Set by default in debug builds and interactive environments.',
  },
  {
    name: '--extra-params <string>',
    description: 'Custom params passed to gradle build command',
    parse: parseArgs,
  },
  {
    name: '-i --interactive',
    description:
      'Explicitly select build variant to use before running a build',
  },
];
