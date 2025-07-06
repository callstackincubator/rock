import fs from 'node:fs';
import path from 'node:path';
import type { PluginApi, PluginOutput } from '@rnef/config';
import {
  color,
  getProjectConfig,
  getProjectRoot,
  intro,
  logger,
  note,
  outro,
  promptConfirm,
  promptMultiselect,
  RnefError,
  spawn,
  spinner,
} from '@rnef/tools';

type CleanOptions = {
  include?: string[];
  'verify-cache'?: boolean;
  all?: boolean;
  interactive?: boolean;
};

type CleanupTask = {
  name: string;
  description: string;
  enabled: boolean;
  action: () => Promise<void>;
};

type ProjectInfo = {
  name: string;
  path: string;
  configFile: string;
};

const CLEANUP_TASK_NAMES = [
  'android',
  'cocoapods', 
  'metro',
  'watchman',
  'npm',
  'yarn',
  'bun',
  'pnpm',
] as const;



/**
 * Validates that the provided task names are valid cleanup tasks.
 * @param taskNames - Array of task names to validate
 * @throws {RnefError} If any task names are invalid
 */
function validateCleanupTasks(taskNames: string[]): void {
  const invalidTasks = taskNames.filter(name => !CLEANUP_TASK_NAMES.includes(name as any));
  if (invalidTasks.length > 0) {
    throw new RnefError(
      `Invalid cleanup task(s): ${invalidTasks.join(', ')}. ` +
      `Valid options are: ${CLEANUP_TASK_NAMES.join(', ')}`
    );
  }
}

/**
 * Recursively scans a directory for RNEF projects.
 * @param baseDir - The base directory to start scanning from
 * @returns Array of found RNEF project information
 */
function findRnefProjects(baseDir: string): ProjectInfo[] {
  const projects: ProjectInfo[] = [];
  const visited = new Set<string>();

  function scanDirectory(dir: string) {
    try {
      const resolvedDir = path.resolve(dir);
      if (visited.has(resolvedDir)) return;
      visited.add(resolvedDir);

      try {
        const configFile = getProjectConfig(resolvedDir);
        projects.push({
          name: path.basename(resolvedDir),
          path: resolvedDir,
          configFile,
        });
      } catch {
        // Not an RNEF project, continue scanning
      }

      const entries = fs.readdirSync(resolvedDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          scanDirectory(path.join(resolvedDir, entry.name));
        }
      }
    } catch (error) {
      // Silently ignore permission errors and other issues
      logger.debug(`Error scanning directory ${dir}: ${error}`);
    }
  }

  scanDirectory(baseDir);
  return projects;
}

function hasMetroProject(projectRoot: string): boolean {
  const metroConfig = path.join(projectRoot, 'metro.config.js');
  const metroConfigTs = path.join(projectRoot, 'metro.config.ts');
  const packageJsonPath = path.join(projectRoot, 'package.json');
  
  if (fs.existsSync(metroConfig) || fs.existsSync(metroConfigTs)) {
    return true;
  }
  
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      return packageJson.dependencies?.metro || packageJson.devDependencies?.metro;
    } catch {
      return false;
    }
  }
  
  return false;
}

/**
 * Cleans temporary directories that match a given pattern.
 * @param pattern - The pattern to match temporary directory names
 */
function cleanTempDirectoryPattern(pattern: string): void {
  const tmpDir = process.env['TMPDIR'] || process.env['TMP'] || '/tmp';
  try {
    const tmpDirContents = fs.readdirSync(tmpDir);
    const matchingFiles = tmpDirContents
      .filter(name => name.startsWith(pattern))
      .map(name => path.join(tmpDir, name));
    
    for (const file of matchingFiles) {
      if (fs.existsSync(file)) {
        fs.rmSync(file, { recursive: true, force: true });
      }
    }
  } catch (error) {
    logger.debug(`${pattern} cache cleanup failed: ${error}`);
  }
}

function createCleanupTasks(projectRoot: string, options: CleanOptions): CleanupTask[] {
  const tasks: CleanupTask[] = [];

  // Android cleanup
  tasks.push({
    name: 'android',
    description: 'Android build caches (Gradle)',
    enabled: true,
    action: async () => {
      const androidDir = path.join(projectRoot, 'android');
      if (fs.existsSync(androidDir)) {
        // Clean Gradle cache
        const gradleDir = path.join(androidDir, '.gradle');
        if (fs.existsSync(gradleDir)) {
          fs.rmSync(gradleDir, { recursive: true, force: true });
        }
        
        // Clean build directory
        const buildDir = path.join(androidDir, 'build');
        if (fs.existsSync(buildDir)) {
          fs.rmSync(buildDir, { recursive: true, force: true });
        }
        
        // Run gradle clean if gradlew exists
        const gradlewPath = path.join(androidDir, 'gradlew');
        if (fs.existsSync(gradlewPath)) {
          try {
            await spawn('sh', [gradlewPath, 'clean'], { cwd: androidDir });
          } catch (error) {
            logger.debug(`Gradle clean failed: ${error}`);
          }
        }
      }
    },
  });

  // CocoaPods cleanup
  tasks.push({
    name: 'cocoapods',
    description: 'CocoaPods cache and Pods directory',
    enabled: true,
    action: async () => {
      const iosDir = path.join(projectRoot, 'ios');
      if (fs.existsSync(iosDir)) {
        // Remove Pods directory
        const podsDir = path.join(iosDir, 'Pods');
        if (fs.existsSync(podsDir)) {
          fs.rmSync(podsDir, { recursive: true, force: true });
        }
        
        // Clean CocoaPods cache
        try {
          await spawn('pod', ['cache', 'clean', '--all'], { cwd: iosDir });
        } catch (error) {
          logger.debug(`CocoaPods cache clean failed: ${error}`);
        }
      }
      
      // Clean global CocoaPods cache directory
      const globalCocoaPodsCache = path.join(process.env['HOME'] || '', '.cocoapods');
      if (fs.existsSync(globalCocoaPodsCache)) {
        try {
          fs.rmSync(globalCocoaPodsCache, { recursive: true, force: true });
        } catch (error) {
          logger.debug(`Global CocoaPods cache cleanup failed: ${error}`);
        }
      }
    },
  });

  // Metro cleanup
  tasks.push({
    name: 'metro',
    description: 'Metro and haste-map caches',
    enabled: true,
    action: async () => {
      // Clean Metro cache
      cleanTempDirectoryPattern('metro-');
      // Clean haste-map cache
      cleanTempDirectoryPattern('haste-map');
    },
  });

  // Watchman cleanup (only for Metro projects)
  const hasMetro = hasMetroProject(projectRoot);
  tasks.push({
    name: 'watchman',
    description: 'Watchman cache (Metro projects only)',
    enabled: hasMetro,
    action: async () => {
      if (hasMetro) {
        try {
          await spawn('killall', ['watchman']);
          await spawn('watchman', ['watch-del-all']);
        } catch (error) {
          logger.debug(`Watchman cleanup failed: ${error}`);
        }
      }
    },
  });

  // NPM cleanup
  tasks.push({
    name: 'npm',
    description: 'node_modules and NPM cache',
    enabled: true,
    action: async () => {
      const nodeModulesDir = path.join(projectRoot, 'node_modules');
      if (fs.existsSync(nodeModulesDir)) {
        fs.rmSync(nodeModulesDir, { recursive: true, force: true });
      }
      
      if (options['verify-cache']) {
        try {
          await spawn('npm', ['cache', 'verify']);
        } catch (error) {
          logger.debug(`NPM cache verify failed: ${error}`);
        }
      }
    },
  });

  // Yarn cleanup
  tasks.push({
    name: 'yarn',
    description: 'Yarn cache',
    enabled: true,
    action: async () => {
      try {
        await spawn('yarn', ['cache', 'clean']);
      } catch (error) {
        logger.debug(`Yarn cache clean failed: ${error}`);
      }
    },
  });

  // Bun cleanup
  tasks.push({
    name: 'bun',
    description: 'Bun cache',
    enabled: true,
    action: async () => {
      try {
        await spawn('bun', ['pm', 'cache', 'rm']);
      } catch (error) {
        logger.debug(`Bun cache clean failed: ${error}`);
      }
    },
  });

  // PNPM cleanup
  tasks.push({
    name: 'pnpm',
    description: 'pnpm cache',
    enabled: true,
    action: async () => {
      try {
        await spawn('pnpm', ['store', 'prune']);
      } catch (error) {
        logger.debug(`pnpm cache clean failed: ${error}`);
      }
    },
  });

  return tasks;
}

async function cleanProject(projectRoot: string, options: CleanOptions) {
  const tasks = createCleanupTasks(projectRoot, options);
  
  let selectedTasks: CleanupTask[];
  
  if (options.include && options.include.length > 0) {
    // Validate task names
    validateCleanupTasks(options.include);
    // Non-interactive mode with specific tasks
    selectedTasks = tasks.filter(task => 
      options.include!.includes(task.name) && task.enabled
    );
  } else if (options.all) {
    // Clean all available tasks
    selectedTasks = tasks.filter(task => task.enabled);
  } else {
    // Interactive mode
    const availableTasks = tasks.filter(task => task.enabled);
    const choices = availableTasks.map(task => ({
      value: task.name,
      label: task.description,
      // Default to true for metro and watchman
      hint: task.name === 'metro' || task.name === 'watchman' ? 'recommended' : undefined,
    }));
    
    const selected = await promptMultiselect({
      message: 'Select caches to clean:',
      options: choices,
      initialValues: ['metro', 'watchman'],
    });
    
    selectedTasks = tasks.filter(task => selected.includes(task.name));
  }
  
  if (selectedTasks.length === 0) {
    logger.info('No cleanup tasks selected.');
    return;
  }
  
  const projectName = path.basename(projectRoot);
  note(`Cleaning ${color.cyan(projectName)} project at ${color.dim(projectRoot)}`);
  
  for (const task of selectedTasks) {
    const taskSpinner = spinner();
    taskSpinner.start(`Cleaning ${task.description}`);
    
    try {
      await task.action();
      taskSpinner.stop(`✓ ${task.description} cleaned`);
    } catch (error) {
      taskSpinner.stop(`✗ Failed to clean ${task.description}`, 1);
      logger.debug(`Task ${task.name} failed: ${error}`);
    }
  }
}

async function cleanCommand(options: CleanOptions) {
  intro('🧹 RNEF Clean');
  
  try {
    // Try to get the project root (automatically finds the project by traversing up from cwd)
    const projectRoot = getProjectRoot();
    // If we get here, we're in an RNEF project
    await cleanProject(projectRoot, options);
    outro('Project cleaned successfully!');
    return;
  } catch {
    // Not in an RNEF project, scan for projects in current directory
    const scanDir = process.cwd();
    const scanSpinner = spinner();
    scanSpinner.start('Scanning for RNEF projects...');
    
    const projects = findRnefProjects(scanDir);
    scanSpinner.stop(`Found ${projects.length} RNEF project(s)`);
    
    if (projects.length === 0) {
      outro('No RNEF projects found in the current directory or subdirectories.');
      return;
    }
    
    if (projects.length === 1) {
      // Only one project found, ask if user wants to clean it
      const shouldClean = await promptConfirm({
        message: `Clean the RNEF project "${projects[0].name}"?`,
        confirmLabel: 'Yes, clean it',
        cancelLabel: 'No, cancel',
      });
      
      if (shouldClean) {
        await cleanProject(projects[0].path, options);
        outro('Project cleaned successfully!');
      } else {
        outro('Cleanup cancelled.');
      }
      return;
    }
    
    // Multiple projects found, let user select
    const choices = projects.map(project => ({
      value: project.path,
      label: `${project.name} (${color.dim(project.path)})`,
    }));
    
    const selectedProjects = await promptMultiselect({
      message: 'Select RNEF projects to clean:',
      options: choices,
    });
    
    if (selectedProjects.length === 0) {
      outro('No projects selected for cleanup.');
      return;
    }
    
    // Clean selected projects
    for (const projectPath of selectedProjects) {
      const project = projects.find(p => p.path === projectPath);
      if (project) {
        await cleanProject(projectPath, options);
      }
    }
    
    outro(`Cleaned ${selectedProjects.length} project(s) successfully!`);
  }
}

export const cleanPlugin = () => (api: PluginApi): PluginOutput => {
  api.registerCommand({
    name: 'clean',
    description: 'Clean caches and build artifacts for RNEF projects',
    action: async (options: CleanOptions) => {
      try {
        await cleanCommand(options);
      } catch (error) {
        if (error instanceof RnefError) {
          logger.error(error.message);
          if (error.cause) {
            logger.debug(`Cause: ${error.cause}`);
          }
        } else {
          logger.error('Unexpected error during cleanup:', error);
        }
        process.exit(1);
      }
    },
    options: [
      {
        name: '--include <string>',
        description: `Comma-separated list of caches to clear (${CLEANUP_TASK_NAMES.join(', ')})`,
        parse: (val: string) => val.split(','),
      },

      {
        name: '--verify-cache',
        description: 'Whether to verify the cache (currently only applies to npm cache)',
      },
      {
        name: '--all',
        description: 'Clean all available caches without interactive prompt',
      },
    ],
  });

  return {
    name: 'internal_clean',
    description: 'Clean plugin for RNEF projects',
  };
};
