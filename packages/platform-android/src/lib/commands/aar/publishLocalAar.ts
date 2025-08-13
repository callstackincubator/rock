import { outro } from '@rock-js/tools';
import { runGradleAar } from '../runGradle.js';
import type { AarProject } from './packageAar.js';

export async function publishLocalAar(aarProject: AarProject) {
  const tasks = ['publishToMavenLocal'];

  await runGradleAar({
    tasks,
    aarProject,
  });
  outro('Success 🎉.');
}

export const options = [
  {
    name: '--module-name <string>',
    description: 'AAR module name',
  },
];
