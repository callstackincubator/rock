import type { RockCLIOptions } from '@rock-js/tools';
import { outro } from '@rock-js/tools';
import { runGradleAar } from '../runGradle.js';
import { toPascalCase } from '../toPascalCase.js';

export interface AarProject {
  sourceDir: string;
  moduleName: string;
}

export type PackageAarFlags = {
  variant: string;
  moduleName?: string;
};

export async function packageAar(aarProject: AarProject, variant: string) {
  normalizeVariant(variant);
  const tasks = [`assemble${toPascalCase(variant)}`];

  await runGradleAar({ tasks, aarProject, variant });
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
] satisfies RockCLIOptions;
