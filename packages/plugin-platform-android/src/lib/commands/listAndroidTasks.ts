import color from 'picocolors';
import spawn from 'nano-spawn';
import { select, spinner } from '@clack/prompts';
import { getGradleWrapper } from './runGradle.js';
import { checkCancelPrompt } from '@rnef/tools';

type GradleTask = {
  task: string;
  description: string;
};

export const parseTasksFromGradleFile = (
  taskType: 'install' | 'bundle' | 'assemble',
  text: string
): Array<GradleTask> => {
  const instalTasks: Array<GradleTask> = [];
  const taskRegex = new RegExp(
    taskType === 'bundle' || taskType === 'assemble'
      ? '^assemble|^bundle'
      : '^install'
  );
  text.split('\n').forEach((line) => {
    if (taskRegex.test(line.trim()) && /(?!.*?Test)^.*$/.test(line.trim())) {
      const metadata = line.split(' - ');
      instalTasks.push({
        task: metadata[0],
        description: metadata[1],
      });
    }
  });
  return instalTasks;
};

export const getGradleTasks = async (
  taskType: 'install' | 'bundle' | 'assemble',
  sourceDir: string
) => {
  const loader = spinner();
  loader.start('Searching for available Gradle tasks...');
  const gradleWrapper = getGradleWrapper();
  try {
    const { output } = await spawn(
      gradleWrapper,
      ['tasks', '--group', taskType === 'install' ? 'install' : 'build'],
      { cwd: sourceDir }
    );
    const tasks = parseTasksFromGradleFile(taskType, output);
    loader.stop(`Found ${tasks.length} Gradle tasks.`);
    return tasks;
  } catch {
    loader.stop('Gradle tasks not found.', 1);
    return [];
  }
};

export const promptForTaskSelection = async (
  taskType: 'install' | 'bundle' | 'assemble',
  sourceDir: string
): Promise<string> => {
  const tasks = await getGradleTasks(taskType, sourceDir);
  if (!tasks.length) {
    throw new Error(`No actionable ${taskType} tasks were found...`);
  }
  const task = checkCancelPrompt<string>(
    await select({
      message: `Select ${taskType} task you want to perform`,
      options: tasks.map((t) => ({
        label: `${color.bold(t.task)} - ${t.description}`,
        value: t.task,
      })),
    })
  );

  return task;
};
