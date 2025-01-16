import { parseArgsStringToArgv } from 'string-argv';

export function parseArgs(args: string) {
  return parseArgsStringToArgv(args);
}
