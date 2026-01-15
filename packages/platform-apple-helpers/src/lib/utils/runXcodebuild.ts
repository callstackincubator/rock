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

// Patterns that indicate an error line (for compile errors)
const ERROR_PATTERNS = [/error:/, /fatal error:/];

// Patterns that should be filtered as noise
const NOISE_PATTERNS = [
  /warning:/,
  /\bnote:/,
  /^\s*export\s+\w+\\?=/, // xcodebuild export statements
  /^\s*\+{1,3}\s/, // bash debug output (set -x)
  /^\s*cd\s+\//, // cd commands
  /^\s*\/bin\/sh\s+-c/, // shell invocations
  /^\s*builtin-/, // xcode builtin commands
];

// Pattern for the failed build commands section
const FAILED_COMMANDS_HEADER = 'The following build commands failed:';
const BUILD_FAILED_PATTERN = /^\*\* BUILD FAILED \*\*$/;
const PHASE_SCRIPT_FAILED_PATTERN = /^Command PhaseScriptExecution failed/;

/**
 * Extract content between PhaseScriptExecution invocation and its failure,
 * filtering out noise like export statements and warnings.
 */
function extractPhaseScriptError(
  lines: string[],
  failureIndex: number,
): string {
  // Find the closest PhaseScriptExecution line above the failure
  let scriptStartIndex = -1;
  for (let i = failureIndex - 1; i >= 0; i--) {
    if (/^PhaseScriptExecution\s/.test(lines[i])) {
      scriptStartIndex = i;
      break;
    }
  }

  if (scriptStartIndex === -1) {
    return lines[failureIndex];
  }

  // Collect lines between PhaseScriptExecution and failure, filtering noise
  const relevantLines: string[] = [];
  for (let i = scriptStartIndex + 1; i <= failureIndex; i++) {
    const line = lines[i];

    // Skip noise (exports, warnings, notes, empty lines at the start)
    const isNoise = NOISE_PATTERNS.some((p) => p.test(line));
    if (isNoise) {
      continue;
    }

    // Skip empty lines if we haven't started collecting content yet
    if (relevantLines.length === 0 && line.trim() === '') {
      continue;
    }

    relevantLines.push(line);
  }

  return relevantLines.join('\n').trim();
}

/**
 * Process xcodebuild output and extract error summary.
 * Exported for testing.
 */
export function extractErrorSummary(output: string): string {
  const lines = output.split('\n');
  let errorSummary = '';
  let inErrorBlock = false;
  let failedCommandsSection = '';
  let inFailedCommandsSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for "The following build commands failed:" section
    if (line.includes(FAILED_COMMANDS_HEADER)) {
      inFailedCommandsSection = true;
      continue;
    }

    // Capture lines in the failed commands section (until we hit a line with failures count)
    if (inFailedCommandsSection) {
      if (line.match(/^\(\d+ failures?\)$/)) {
        inFailedCommandsSection = false;
        continue;
      }
      // Capture non-empty command lines
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('Building workspace')) {
        if (failedCommandsSection) {
          failedCommandsSection += '\n';
        }
        failedCommandsSection += trimmedLine;
      }
      continue;
    }

    // Skip BUILD FAILED line
    if (BUILD_FAILED_PATTERN.test(line)) {
      continue;
    }

    // Handle PhaseScriptExecution failure - look backwards for script output
    if (PHASE_SCRIPT_FAILED_PATTERN.test(line)) {
      const scriptError = extractPhaseScriptError(lines, i);
      if (errorSummary) {
        errorSummary += '\n\n';
      }
      errorSummary += scriptError;
      continue;
    }

    // Check if this is a new build step - reset error block but don't include it
    const isBuildStep = BUILD_STEP_PATTERNS.some((p) => p.test(line));
    if (isBuildStep) {
      inErrorBlock = false;
      continue;
    }

    // Check if this is noise - skip
    const isNoise = NOISE_PATTERNS.some((p) => p.test(line));
    if (isNoise) {
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
      // Stop on empty lines (end of error context)
      if (line.trim() === '') {
        inErrorBlock = false;
        continue;
      }

      // Capture the line (code snippet, caret, etc.)
      errorSummary += `${line}\n`;
    }
  }

  // Combine error summary with failed commands info
  let result = errorSummary.trim();
  if (failedCommandsSection) {
    if (result) {
      result +=
        '\n\nThe following build commands failed:\n' + failedCommandsSection;
    } else {
      result = 'The following build commands failed:\n' + failedCommandsSection;
    }
  }

  return result;
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
      // when running with multiple destinations, xcodebuild will run
      // the script phases etc again, so we fail early.
      if (chunk.includes('** BUILD FAILED **')) {
        (await process.nodeChildProcess).kill();
        break;
      }
    }

    await process;

    loader.stop(successMessage);

    return {
      fullLog,
      errorSummary: undefined,
    };
  } catch (error) {
    loader.stop(`Failed: ${startMessage}`, 1);

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
