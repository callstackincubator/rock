import chalk from 'chalk';
import spawn from 'nano-spawn';
import {
  parseTasksFromGradleFile,
  promptForTaskSelection,
} from '../listAndroidTasks.js';
import { it, describe, vi, Mock, MockedFunction } from 'vitest';
import { select } from '@clack/prompts';

vi.mock('nano-spawn', () => {
  return {
    default: vi.fn(),
  };
});

vi.mock('@clack/prompts', () => {
  return {
    spinner: vi.fn(() => ({ start: vi.fn(), message: vi.fn(), stop: vi.fn() })),
    select: vi.fn(),
  };
});

const gradleTaskOutput = `
> Task :tasks

------------------------------------------------------------
Tasks runnable from root project 'com.bananas'
------------------------------------------------------------

Android tasks
-------------
androidDependencies - Displays the Android dependencies of the project.
signingReport - Displays the signing info for the base and test modules
sourceSets - Prints out all the source sets defined in this project.

Build tasks
-----------
assemble - Assemble main outputs for all the variants.
assembleAndroidTest - Assembles all the Test applications.
assembleDebug - Assembles main outputs for all Debug variants.
assembleProduction - Assembles main outputs for all Production variants.
assembleRelease - Assembles main outputs for all Release variants.
assembleUat - Assembles main outputs for all Uat variants.
build - Assembles and tests this project.
buildDependents - Assembles and tests this project and all projects that depend on it.
buildNeeded - Assembles and tests this project and all projects it depends on.
bundle - Assemble bundles for all the variants.
bundleDebug - Assembles bundles for all Debug variants.
bundleProduction - Assembles bundles for all Production variants.
bundleRelease - Assembles bundles for all Release variants.
bundleUat - Assembles bundles for all Uat variants.
clean - Deletes the build directory.
compileProductionDebugAndroidTestSources
compileProductionDebugSources
compileProductionDebugUnitTestSources
compileProductionReleaseSources
compileProductionReleaseUnitTestSources
compileUatDebugAndroidTestSources
compileUatDebugSources
compileUatDebugUnitTestSources
compileUatReleaseSources
compileUatReleaseUnitTestSources

Build Setup tasks
-----------------
init - Initializes a new Gradle build.
wrapper - Generates Gradle wrapper files.

Help tasks
----------
buildEnvironment - Displays all buildscript dependencies declared in root project 'com.bananas'.
dependencies - Displays all dependencies declared in root project 'com.bananas'.
dependencyInsight - Displays the insight into a specific dependency in root project 'com.bananas'.
help - Displays a help message.
javaToolchains - Displays the detected java toolchains.
outgoingVariants - Displays the outgoing variants of root project 'com.bananas'.
projects - Displays the sub-projects of root project 'com.bananas'.
properties - Displays the properties of root project 'com.bananas'.
resolvableConfigurations - Displays the configurations that can be resolved in root project 'com.bananas'.
tasks - Displays the tasks runnable from root project 'com.bananas' (some of the displayed tasks may belong to subprojects).

Install tasks
-------------
installProductionDebug - Installs the DebugProductionDebug build.
installProductionDebugAndroidTest - Installs the android (on device) tests for the ProductionDebug build.
installProductionRelease - Installs the ReleaseProductionRelease build.
installUatDebug - Installs the DebugUatDebug build.
installUatDebugAndroidTest - Installs the android (on device) tests for the UatDebug build.
installUatRelease - Installs the ReleaseUatRelease build.
uninstallAll - Uninstall all applications.

`;

const tasksList = [
  {
    description: 'Installs the DebugProductionDebug build.',
    task: 'installProductionDebug',
  },
  {
    description: 'Installs the ReleaseProductionRelease build.',
    task: 'installProductionRelease',
  },
  {
    description: 'Installs the DebugUatDebug build.',
    task: 'installUatDebug',
  },
  {
    description: 'Installs the ReleaseUatRelease build.',
    task: 'installUatRelease',
  },
];

describe('promptForTaskSelection', () => {
  it('should prompt with correct tasks', async () => {
    (spawn as Mock).mockResolvedValueOnce({ stdout: gradleTaskOutput });
    (select as MockedFunction<typeof select>).mockResolvedValueOnce(
      Promise.resolve({
        task: [],
      })
    );

    await promptForTaskSelection('install', 'sourceDir');

    expect(select).toHaveBeenCalledWith({
      options: tasksList.map((t) => ({
        label: `${chalk.bold(t.task)} - ${t.description}`,
        value: t.task,
      })),
      message: 'Select install task you want to perform',
    });
  });
});

describe('parseTasksFromGradleFile', () => {
  it('should correctly parse gradle tasks output for "install" taskType', () => {
    const tasks = parseTasksFromGradleFile('install', gradleTaskOutput);

    expect(tasks).toEqual(tasksList);
  });
  it('should correctly parse gradle tasks output for "build" taskType', () => {
    const buildTasks = parseTasksFromGradleFile('build', gradleTaskOutput);

    expect(buildTasks).toContainEqual({
      description: 'Assemble main outputs for all the variants.',
      task: 'assemble',
    });

    expect(buildTasks).not.toContainEqual({
      description: 'Assembles all the Test applications.',
      task: 'assembleAndroidTest',
    });
  });
});
