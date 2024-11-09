import {toPascalCase} from './toPascalCase.js';
import type {BuildFlags} from '../buildAndroid/index.js';

export function getTaskNames(
  appName: string,
  mode: BuildFlags['mode'] = 'debug',
  tasks: BuildFlags['tasks'],
  taskPrefix: 'assemble' | 'install' | 'bundle',
): Array<string> {
  const appTasks =
    tasks && tasks.length ? tasks : [taskPrefix + toPascalCase(mode)];

  return appName
    ? appTasks.map((command) => `${appName}:${command}`)
    : appTasks;
}
