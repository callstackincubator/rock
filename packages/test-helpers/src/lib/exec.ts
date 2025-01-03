import type { ExecOptions } from 'node:child_process';
import { exec } from 'node:child_process';

export const execAsync = (command: string, options?: ExecOptions) => {
  return new Promise((resolve, reject) => {
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
        reject(`exec error: ${error}\n\n${stdout}\n\n${stderr}`);
        return;
      }
      resolve(stdout);
    });
  });
};
