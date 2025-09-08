import {
  type ChildProcessWithoutNullStreams,
  spawn,
  type SpawnOptionsWithoutStdio,
} from 'node:child_process';
import * as path from 'node:path';
import type { PluginApi } from '@rock-js/config';
import {
  copyDirSync,
  logger,
  normalizeProjectName,
  replacePlaceholder,
} from '@rock-js/tools';

export async function regenNativeDirs(api: PluginApi) {
  const projectRoot = api.getProjectRoot();

  try {
    const iosTemplatePath = path.join(
      projectRoot,
      'node_modules',
      '@rock-js',
      'platform-ios',
      'template',
      'ios',
    );

    copyDirSync(iosTemplatePath, path.join(projectRoot, 'ios'));

    const androidTemplatePath = path.join(
      projectRoot,
      'node_modules',
      '@rock-js',
      'platform-android',
      'template',
      'android',
    );

    copyDirSync(androidTemplatePath, path.join(projectRoot, 'android'));

    replacePlaceholder(
      projectRoot,
      normalizeProjectName(path.basename(projectRoot)),
    );

    return { success: true, exitCode: 0, stdout: '', stderr: '' };
  } catch (e) {
    logger.error(String(e));

    return {
      success: false,
      exitCode: 1,
      stdout: '',
      stderr: String(e),
    };
  }
}

export async function cleanNativeDirs(api: PluginApi) {
  const result = await runCommand('rm', ['-r', '-f', 'ios', 'android'], {
    cwd: api.getProjectRoot(),
  });
  return result;
}

type CommandResult = {
  success: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
};

async function runCommand(
  command: string,
  args: string[],
  options: SpawnOptionsWithoutStdio = {},
): Promise<CommandResult> {
  return await new Promise<CommandResult>((resolve) => {
    const child: ChildProcessWithoutNullStreams = spawn(command, args, {
      ...options,
      stdio: 'pipe',
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('error', (error: Error) => {
      resolve({
        success: false,
        exitCode: null,
        stdout,
        stderr: String(error),
      });
    });

    child.on('close', (code: number | null) => {
      resolve({ success: code === 0, exitCode: code, stdout, stderr });
    });
  });
}
