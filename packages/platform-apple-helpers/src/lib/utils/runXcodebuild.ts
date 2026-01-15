import type { SubprocessError } from '@rock-js/tools';
import { logger, spawn, spinner } from '@rock-js/tools';

// Patterns that indicate a new build step (context)
const BUILD_STEP_PATTERNS = [
  /^CompileSwift\s/,
  /^SwiftCompile\s/,
  /^SwiftDriver\s/,
  /^Ld\s/,
  /^PhaseScriptExecution\s/,
  /^CompileC\s/,
  /^CompileAssetCatalog\s/,
  /^ProcessInfoPlistFile\s/,
];

// Patterns that indicate an error line
const ERROR_PATTERNS = [/error:/, /fatal error:/];

// Patterns that should stop error context capture (noise)
const NOISE_PATTERNS = [/warning:/, /\bnote:/];

/**
 * Process xcodebuild output and extract error summary.
 * Exported for testing.
 */
export function extractErrorSummary(output: string): string {
  const lines = output.split('\n');
  let errorSummary = '';
  let inErrorBlock = false;

  for (const line of lines) {
    // Check if this is a new build step - reset error block but don't include it
    const isBuildStep = BUILD_STEP_PATTERNS.some((p) => p.test(line));
    if (isBuildStep) {
      inErrorBlock = false;
      continue;
    }

    // Check if this is an error line
    const isError = ERROR_PATTERNS.some((p) => p.test(line));
    if (isError) {
      if (errorSummary) {
        errorSummary += '\n';
      }
      errorSummary += `${line}\n`;
      inErrorBlock = true;
      continue;
    }

    // If we're in an error block, capture follow-up lines
    if (inErrorBlock) {
      // Stop on noise (warnings, notes)
      const isNoise = NOISE_PATTERNS.some((p) => p.test(line));
      if (isNoise) {
        inErrorBlock = false;
        continue;
      }

      // Stop on empty lines (end of error context)
      if (line.trim() === '') {
        inErrorBlock = false;
        continue;
      }

      // Capture the line (code snippet, caret, etc.)
      errorSummary += `${line}\n`;
    }
  }

  return errorSummary.trim();
}

export async function runXcodebuild(
  args: string[],
  options: {
    cwd?: string;
    reportProgress?: boolean;
  } = { reportProgress: true },
) {
  let fullLog = '';
  const isArchiveTask = args.includes('-archivePath');
  const isMergeFrameworksTask = args.includes('-create-xcframework');
  const startMessage = isArchiveTask
    ? 'Archiving the app'
    : isMergeFrameworksTask
      ? 'Merging frameworks'
      : 'Building the app';
  const successMessage = isArchiveTask
    ? 'Archived the app'
    : isMergeFrameworksTask
      ? 'Merged frameworks'
      : 'Built the app';
  const loader = spinner({ indicator: 'timer' });
  loader.start(startMessage);

  const processChunk = (chunk: string) => {
    fullLog += chunk + '\n';

    if (options.reportProgress) {
      reportProgress(chunk, loader, startMessage);
    }
  };

  try {
    const process = spawn('xcodebuild', args, {
      cwd: options.cwd,
    });

    for await (const chunk of process) {
      processChunk(chunk);
    }

    await process;

    loader.stop(successMessage);

    return {
      fullLog,
      errorSummary: undefined,
    };
  } catch (error) {
    loader.stop(`Failed: ${startMessage}`, 1);
    console.log(fullLog)
    return {
      fullLog,
      errorSummary:
        extractErrorSummary(fullLog) || (error as SubprocessError).command,
    };
  }
}

let lastProgress = 0;
/**
 * Creates an ASCII progress bar
 * @param percent - Percentage of completion (0-100)
 * @param length - Length of the progress bar in characters
 * @returns ASCII progress bar string
 */
function createProgressBar(percent: number, length = 20): string {
  const latestPercent = percent > lastProgress ? percent : lastProgress;
  lastProgress = latestPercent;
  const filledLength = Math.round(length * (latestPercent / 100));
  const emptyLength = length - filledLength;

  const filled = '█'.repeat(filledLength);
  const empty = '░'.repeat(emptyLength);

  return `[${filled}${empty}]`;
}

function reportProgress(
  chunk: string,
  loader: ReturnType<typeof spinner>,
  message: string,
) {
  if (logger.isVerbose()) {
    return;
  }

  if (chunk.includes('PhaseScriptExecution')) {
    if (chunk.includes('[CP-User]\\ [Hermes]\\ Replace\\ Hermes\\')) {
      const progressBar = createProgressBar(10);
      loader.message(`${message} ${progressBar}`);
    }
    if (
      chunk.includes('[CP-User]\\ [RN]Check\\ rncore') &&
      chunk.includes('React-Fabric')
    ) {
      const progressBar = createProgressBar(35);
      loader.message(`${message} ${progressBar}`);
    }
    if (chunk.includes('[CP-User]\\ [RN]Check\\ FBReactNativeSpec')) {
      const progressBar = createProgressBar(53);
      loader.message(`${message} ${progressBar}`);
    }
    if (
      chunk.includes('[CP-User]\\ [RN]Check\\ rncore') &&
      chunk.includes('React-FabricComponents')
    ) {
      const progressBar = createProgressBar(66);
      loader.message(`${message} ${progressBar}`);
    }
    if (chunk.includes('[CP]\\ Check\\ Pods\\ Manifest.lock')) {
      const progressBar = createProgressBar(90);
      loader.message(`${message} ${progressBar}`);
    }
  } else if (chunk.includes('BUILD SUCCEEDED')) {
    const progressBar = createProgressBar(100);
    loader.message(`${message} ${progressBar}`);
  }
}
