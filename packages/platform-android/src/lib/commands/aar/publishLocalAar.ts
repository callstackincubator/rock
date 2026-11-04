import type { RockCLIOptions } from '@rock-js/tools';
import { outro, parseArgs } from '@rock-js/tools';
import { runGradleAar } from '../runGradle.js';
import type { AarProject } from './packageAar.js';

export type PublishLocalAarFlags = {
  /**
   * AAR module name.
   */
  moduleName?: string;

  /**
   * Extra parameters passed to Gradle, e.g. `-PmyProperty=value`.
   */
  extraParams?: string[];
};

export async function publishLocalAar(
  aarProject: AarProject,
  extraParams?: string[],
) {
  const tasks = ['publishToMavenLocal'];

  await runGradleAar({
    tasks,
    aarProject,
    extraParams,
  });
  outro('Success 🎉.');
}

export const options = [
  {
    name: '--module-name <string>',
    description: 'AAR module name',
  },
  {
    name: '--extra-params <string>',
    description: 'Custom params passed to gradle publish command',
    parse: parseArgs,
  },
] satisfies RockCLIOptions;
