import type { RockCLIOptions } from '@rock-js/tools';
import { outro, parseArgs } from '@rock-js/tools';
import { runGradleAar } from '../runGradle.js';
import { toPascalCase } from '../toPascalCase.js';

export interface AarProject {
  /**
   * The source directory of the AAR project.
   */
  sourceDir: string;

  /**
   * AAR module name.
   */
  moduleName: string;
}

export type PackageAarFlags = {
  /**
   * Your app's build variant, which is constructed from build type and product flavor, e.g. 'debug' or 'freeRelease'.
   */
  variant: string;

  /**
   * AAR module name.
   */
  moduleName?: string;

  /**
   * Extra parameters passed to Gradle, e.g. `-PmyProperty=value`.
   */
  extraParams?: string[];
};

export async function packageAar(
  aarProject: AarProject,
  variant: string,
  extraParams?: string[],
) {
  normalizeVariant(variant);
  const tasks = [`assemble${toPascalCase(variant)}`];

  await runGradleAar({ tasks, aarProject, variant, extraParams });
  outro('Success 🎉.');
}

export async function localPublishAar(aarProject: AarProject, variant: string) {
  const tasks = ['publishToMavenLocal'];

  await runGradleAar({ tasks, aarProject, variant });
  outro('Success 🎉.');
}

function normalizeVariant(variant: string) {
  if (!variant) {
    variant = 'debug';
  }
}

export const options = [
  {
    name: '--variant <string>',
    description:
      "Specify your app's build variant, which is constructed from build type and product flavor, e.g. 'debug' or 'freeRelease'.",
  },
  {
    name: '--module-name <string>',
    description: 'AAR module name',
  },
  {
    name: '--extra-params <string>',
    description: 'Custom params passed to gradle build command',
    parse: parseArgs,
  },
] satisfies RockCLIOptions;
