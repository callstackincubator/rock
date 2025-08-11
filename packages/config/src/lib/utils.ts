import { codeFrameColumns } from '@babel/code-frame';

export function formatValidationError(config: unknown, error: any): string {
  // Functions by default are replaced with null in the preview, so we replace them with [Function]
  const configReplacer = (_: string, value: unknown) => {
    if (typeof value === 'function') {
      return '[Function]';
    }
    if (
      Array.isArray(value) &&
      value.some((item) => typeof item === 'function')
    ) {
      return value.map((item) =>
        typeof item === 'function' ? '[Function]' : item,
      );
    }
    return value;
  };

  const errorDetails = error.details[0];
  const path = errorDetails.path;
  const configString = JSON.stringify(config, configReplacer, 2);
  const lines = configString.split('\n');
  const lastPathKey = path[path.length - 1];
  let line = 1;
  let column = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`"${lastPathKey}"`)) {
      line = i + 1;
      column = lines[i].indexOf(`"${lastPathKey}"`) + 1;
      break;
    }
  }

  return codeFrameColumns(
    configString,
    { start: { line, column } },
    { message: error.message, highlightCode: true },
  );
}
