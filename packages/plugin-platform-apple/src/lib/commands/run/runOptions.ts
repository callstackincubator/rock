import { BuilderCommand } from '../../types/index.js';
import { BuildFlags, getBuildOptions } from '../build/buildOptions.js';

export interface RunFlags extends BuildFlags {
  binaryPath?: string;
  port: string;
  remoteBuildCache?: boolean;
}

export const getRunOptions = ({ platformName }: BuilderCommand) => {
  return [
    {
      name: '--port <number>',
      default: process.env['RCT_METRO_PORT'] || '8081',
    },
    {
      name: '--binary-path <string>',
      description:
        'Path relative to project root where pre-built .app binary lives.',
    },
    {
      name: '--no-remote-build-cache',
      description: 'Do not use remote build cacheing.',
    },
    ...getBuildOptions({ platformName }),
  ];
};
