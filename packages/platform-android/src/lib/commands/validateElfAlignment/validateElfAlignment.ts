import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  color,
  logger,
  RockError,
  spawn,
  type SubprocessError,
} from '@rock-js/tools';
import { findAndroidBuildTool, getAndroidBuildToolsPath } from '../../paths.js';

export const ELF_ALIGNMENT_REGEX = /2\*\*(1[4-9]|[2-9][0-9]|[1-9][0-9]{2,})/;

export async function validateElfAlignment(apkPath: string) {
  if (!fs.existsSync(apkPath)) {
    throw new RockError(`APK not found "${apkPath}".`);
  }

  const tempDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), `${path.basename(apkPath, '.apk')}_elf_`),
  );

  try {
    logger.log('Checking APK ELF alignment...');
    await runZipAlignCheck(apkPath);
    const hasNativeLibs = await extractApkLibs(apkPath, tempDir);
    if (!hasNativeLibs) {
      logger.info('No native shared libraries found in APK. Skipping ELF alignment check.');
      return;
    }
    const unalignedLibs = await findUnalignedLibs(tempDir);

    if (unalignedLibs.length > 0) {
      logger.info(`Found ${unalignedLibs.length} unaligned libs:`);
      for (const lib of unalignedLibs) {
        logger.info(`  - ${lib}`);
      }
    }

    const critical = unalignedLibs.filter(isRequiredAlignedAbi);

    if (critical.length > 0) {
      logger.warn(
        `\nThe following ${critical.length} lib(s) must be 16KB aligned (arm64-v8a/x86_64):`,
      );
      for (const lib of critical) {
        logger.warn(`  - ${lib}`);
      }
      throw new RockError('ELF alignment check failed.');
    }

    logger.info('ELF alignment check passed.');
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}

async function runZipAlignCheck(apkPath: string) {
  const zipAlignPath = findAndroidBuildTool('zipalign');
  if (!zipAlignPath) {
    logger.info(
      `NOTICE: "zipalign" not found in Android Build-Tools directory: ${color.bold(
        getAndroidBuildToolsPath(),
      )}`,
    );
    return;
  }

  const supportsPageSize = await spawn(zipAlignPath, ['--help'], {
    stdio: 'pipe',
  })
    .then(({ output }) => output.includes('-P <pagesize_kb>'))
    .catch(() => false);

  if (!supportsPageSize) {
    logger.info(
      'NOTICE: Zip alignment check requires build-tools version 35.0.0-rc3 or higher.',
    );
    logger.info('  You can install the latest build-tools by running:');
    logger.info('    sdkmanager "build-tools;35.0.0-rc3"');
    return;
  }

  try {
    const { output } = await spawn(
      zipAlignPath,
      ['-v', '-c', '-P', '16', '4', apkPath],
      { stdio: 'pipe' },
    );
    const filtered = output
      .split('\n')
      .filter(
        (line: string) =>
          line.includes('lib/arm64-v8a') ||
          line.includes('lib/x86_64') ||
          line.includes('Verification'),
      )
      .join('\n')
      .trim();
    if (filtered) {
      logger.log('APK zip-alignment');
      logger.log(filtered);
    }
  } catch (error) {
    const errorMessage =
      (error as SubprocessError).stderr || (error as SubprocessError).stdout;
    logger.warn(`Zip alignment check failed: ${errorMessage}`.trim());
  }
}

/**
 * Extracts native shared libraries from the APK.
 * Returns `false` if the APK contains no native libraries (unzip exit code 11).
 * This mirrors Android's check_elf_alignment.sh which ignores unzip failures
 * when no lib/ entries exist.
 */
async function extractApkLibs(apkPath: string, tempDir: string) {
  try {
    await spawn('unzip', [apkPath, 'lib/*', '-d', tempDir], { stdio: 'pipe' });
    return true;
  } catch (error) {
    // unzip exits with code 11 when no files match the pattern,
    // e.g. a pure Kotlin/Java APK with no native libraries.
    if ((error as SubprocessError).exitCode === 11) {
      return false;
    }
    throw new RockError(
      `Failed to extract shared libraries from APK: ${apkPath}`,
      { cause: (error as SubprocessError).stderr },
    );
  }
}

const REQUIRED_ALIGNED_ABIS = ['arm64-v8a', 'x86_64'];

async function findUnalignedLibs(rootDir: string) {
  const files = await listFiles(rootDir);
  const unaligned: string[] = [];

  for (const filePath of files) {
    const isElf = await isElfBinary(filePath);
    if (!isElf) {
      continue;
    }

    const alignment = await readElfAlignment(filePath);
    if (alignment && ELF_ALIGNMENT_REGEX.test(alignment)) {
      logger.debug(
        `${path.relative(rootDir, filePath)}: ALIGNED (${alignment})`,
      );
      continue;
    }

    logger.debug(
      `${path.relative(rootDir, filePath)}: UNALIGNED (${alignment || 'unknown'})`,
    );
    unaligned.push(path.relative(rootDir, filePath));
  }

  return unaligned;
}

function isRequiredAlignedAbi(libPath: string) {
  return REQUIRED_ALIGNED_ABIS.some((abi) => libPath.startsWith(`lib/${abi}/`));
}

async function isElfBinary(filePath: string) {
  try {
    const { output } = await spawn('file', [filePath], { stdio: 'pipe' });
    return output.includes(': ELF');
  } catch (error) {
    throw new RockError(`Failed to inspect file type for "${filePath}".`, {
      cause: (error as SubprocessError).stderr,
    });
  }
}

async function readElfAlignment(filePath: string) {
  try {
    const { output } = await spawn('objdump', ['-p', filePath], {
      stdio: 'pipe',
    });
    const loadLine = output
      .split('\n')
      .map((line: string) => line.trim())
      .find((line: string) => line.startsWith('LOAD'));
    if (!loadLine) {
      return '';
    }
    const parts = loadLine.split(/\s+/);
    return parts[parts.length - 1] ?? '';
  } catch (error) {
    throw new RockError(`Failed to inspect ELF headers for "${filePath}".`, {
      cause: (error as SubprocessError).stderr,
    });
  }
}

async function listFiles(dir: string): Promise<string[]> {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}
