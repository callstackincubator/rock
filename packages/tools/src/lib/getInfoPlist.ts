import { logger, spawn } from '../index.js';

export async function getInfoPlist(
  infoPlistPath: string,
): Promise<Record<string, any> | null> {
  try {
    const { stdout } = await spawn(
      'plutil',
      ['-convert', 'json', '-o', '-', infoPlistPath],
      { stdio: 'pipe' },
    );
    return JSON.parse(stdout);
  } catch (error) {
    logger.debug(`Failed to get Info.plist: ${error}`);
  }
  return null;
}
