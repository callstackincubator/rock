import { spinner } from '@clack/prompts';
import { getTaskNames } from './buildAndroid/getTaskNames.js';
import { AndroidProject, Flags } from './runAndroid/index.js';
import { promptForTaskSelection } from './buildAndroid/listAndroidTasks.js';
import { getCPU, getDevices } from './buildAndroid/adb.js';
import { link, logger } from '@react-native-community/cli-tools';
import spawn from 'nano-spawn';
import { BuildFlags } from './buildAndroid/index.js';
import chalk from 'chalk';

export async function runGradle({
  taskType,
  androidProject,
  selectedTask,
  args,
}: {
  taskType: 'install' | 'build';
  androidProject: AndroidProject;
  selectedTask?: string;
  args: BuildFlags | Flags;
}) {
  if (args.tasks && args.mode) {
    logger.warn(
      'Both "tasks" and "mode" parameters were passed to "build" command. Using "tasks" for building the app.'
    );
  }

  let { tasks } = args;

  if (args.interactive && !selectedTask) {
    const selectedTask = await promptForTaskSelection(
      taskType,
      androidProject.sourceDir
    );
    if (selectedTask) {
      // @todo - check if we need to replace installDebug with assembleDebug
      tasks = [selectedTask];
    }
  }

  const gradleArgs = getTaskNames(
    androidProject.appName,
    args.mode,
    tasks,
    taskType === 'install' ? 'install' : 'bundle'
  );

  gradleArgs.push('-x', 'lint');

  if (args.extraParams) {
    gradleArgs.push(...args.extraParams);
  }

  if ('port' in args && args.port != null) {
    gradleArgs.push('-PreactNativeDevServerPort=' + args.port);
  }

  if (args.activeArchOnly) {
    const devices = getDevices();
    const architectures = devices
      .map(getCPU)
      .filter(
        (arch, index, array) => arch != null && array.indexOf(arch) === index
      );

    if (architectures.length > 0) {
      logger.info(`Detected architectures ${architectures.join(', ')}`);
      gradleArgs.push('-PreactNativeArchitectures=' + architectures.join(','));
    }
  }

  const gradleWrapper = getGradleWrapper();
  const loader = spinner();
  switch (taskType) {
    case 'install': {
      try {
        loader.start('Installing the app');
        await spawn(gradleWrapper, gradleArgs, {
          stdio: ['ignore', 'ignore', 'pipe'],
          cwd: androidProject.sourceDir,
        });
        loader.stop('Installed the app.');
      } catch (error) {
        loader.stop(createInstallError(error as Error & { stderr: string }), 1);
        process.exit(1);
      }
      return;
    }
    case 'build':
      try {
        loader.start('Building the app');
        await spawn(gradleWrapper, gradleArgs, {
          stdio: ['ignore', 'ignore', 'inherit'],
          cwd: androidProject.sourceDir,
        });
        loader.stop('Build successful.');
      } catch (error) {
        loader.stop(
          `Failed to build the app. ${(error as { message: string }).message}`,
          1
        );
        process.exit(1);
      }
  }
}

export function getGradleWrapper() {
  return process.platform.startsWith('win') ? 'gradlew.bat' : './gradlew';
}

function createInstallError(error: Error & { stderr: string }) {
  const stderr = (error.stderr || '').toString();
  let message = '';

  // Handle some common failures and make the errors more helpful
  if (stderr.includes('No connected devices')) {
    message =
      'Make sure you have an Android emulator running or a device connected.';
  } else if (
    stderr.includes('licences have not been accepted') ||
    stderr.includes('accept the SDK license')
  ) {
    message = `Please accept all necessary Android SDK licenses using Android SDK Manager: "${chalk.bold(
      '$ANDROID_HOME/tools/bin/sdkmanager --licenses'
    )}."`;
  } else if (stderr.includes('requires Java')) {
    message = `Looks like your Android environment is not properly set. Please go to ${chalk.dim.underline(
      link.docs('environment-setup', 'android', {
        hash: 'jdk-studio',
        guide: 'native',
      })
    )} and follow the React Native CLI QuickStart guide to install the compatible version of JDK.`;
  } else if (
    stderr.includes('INSTALL_FAILED_INSUFFICIENT_STORAGE') ||
    stderr.includes('Requested internal only, but not enough space')
  ) {
    message =
      'The device is out of space. Increase storage or remove apps and try again.';
  } else {
    message = error.message;
    // Pass the error message from the command to stdout because we pipe it to
    // parent process so it's not visible
    logger.log(stderr);
  }

  return `Failed to install the app. ${message}`;
}
