import { CLIError } from '@react-native-community/cli-tools';
import chalk from 'chalk';
import spawn from 'nano-spawn';
import { select, spinner } from '@clack/prompts';

type GradleTask = {
  task: string;
  description: string;
};

export const parseTasksFromGradleFile = (
  taskType: 'install' | 'build',
  text: string
): Array<GradleTask> => {
  const instalTasks: Array<GradleTask> = [];
  const taskRegex = new RegExp(
    taskType === 'build' ? '^assemble|^bundle' : '^install'
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
  taskType: 'install' | 'build',
  sourceDir: string
) => {
  const loader = spinner();
  loader.start('Searching for available Gradle tasks...');
  const cmd = process.platform.startsWith('win') ? 'gradlew.bat' : './gradlew';
  try {
    const { stdout } = await spawn(cmd, ['tasks', '--group', taskType], {
      cwd: sourceDir,
    });
    loader.stop('Gradle tasks found.');
    return parseTasksFromGradleFile(taskType, stdout);
  } catch {
    loader.stop('Gradle tasks not found.', 1);
    return [];
  }
};

export const promptForTaskSelection = async (
  taskType: 'install' | 'build',
  sourceDir: string
): Promise<string> => {
  const tasks = await getGradleTasks(taskType, sourceDir);
  if (!tasks.length) {
    throw new CLIError(`No actionable ${taskType} tasks were found...`);
  }
  const task = (await select({
    message: `Select ${taskType} task you want to perform`,
    options: tasks.map((t) => ({
      label: `${chalk.bold(t.task)} - ${t.description}`,
      value: t.task,
    })),
  })) as string;

  return task;
};
