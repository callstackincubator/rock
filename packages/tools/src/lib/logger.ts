import { log as clackLog } from '@clack/prompts';
import color from 'picocolors';
import isUnicodeSupported from 'is-unicode-supported';

const unicode = isUnicodeSupported();

const unicodeWithFallback = (c: string, fallback: string) =>
  unicode ? c : fallback;

const SYMBOL_DEBUG = unicodeWithFallback('●', '•');
const SEPARATOR = ', ';

let verbose = false;

const formatMessages = (messages: Array<string>) => messages.join(SEPARATOR);

const mapLines = (text: string, colorFn: (line: string) => string) =>
  text.split('\n').map(colorFn).join('\n');

const success = (...messages: Array<string>) => {
  const output = formatMessages(messages);
  clackLog.success(mapLines(output, color.green));
};

const info = (...messages: Array<string>) => {
  const output = formatMessages(messages);
  clackLog.info(mapLines(output, color.cyan));
};

const warn = (...messages: Array<string>) => {
  const output = formatMessages(messages);
  clackLog.warn(mapLines(output, color.yellow));
};

const error = (...messages: Array<string>) => {
  const output = formatMessages(messages);
  clackLog.error(mapLines(output, color.red));
};

const debug = (...messages: Array<string>) => {
  if (verbose) {
    const output = formatMessages(messages);
    clackLog.message(mapLines(output, color.dim), {
      symbol: color.dim(SYMBOL_DEBUG),
    });
  }
};

const log = (...messages: Array<string>) => {
  clackLog.step(formatMessages(messages));
};

const setVerbose = (level: boolean) => {
  verbose = level;
};

const isVerbose = () => verbose;

export default {
  success,
  info,
  warn,
  error,
  debug,
  log,
  setVerbose,
  isVerbose,
};
