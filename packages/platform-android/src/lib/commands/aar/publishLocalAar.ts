import { outro } from '@rnef/tools';
import { runGradleAar } from '../runGradle.js';
import type { AarProject } from './packageAar.js';

export type PublishLocalAarFlags = {
  moduleName: string;
};

export async function publishLocalAar(
  aarProject: AarProject,
  args: PublishLocalAarFlags
) {
  const tasks = ['publishToMavenLocal'];

  await runGradleAar({ tasks, aarProject, args, isPublishTask: true });
  outro('Success 🎉.');
}

export const options = [
  {
    name: '--module-name <string>',
    description: 'AAR module name',
  },
];
