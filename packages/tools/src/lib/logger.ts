import util from 'node:util';
import { log as clackLog } from '@clack/prompts';
import color from 'picocolors';
import isUnicodeSupported from 'is-unicode-supported';

const unicode = isUnicodeSupported();

const unicodeWithFallback = (c: string, fallback: string) =>
  unicode ? c : fallback;

const SYMBOL_DEBUG = unicodeWithFallback('●', '•');

let verbose = false;

const formatMessages = (elements: Array<unknown>) =>
  elements.map((e) => util.inspect(e)).join(' ');

const mapLines = (text: string, colorFn: (line: string) => string) =>
  text.split('\n').map(colorFn).join('\n');

const success = (...messages: Array<string>) => {
  const output = formatMessages(messages);
  clackLog.success(output);
};

const info = (...messages: Array<string>) => {
  const output = formatMessages(messages);
  clackLog.info(output);
};

const warn = (...messages: Array<string>) => {
  const output = formatMessages(messages);
  clackLog.warn(mapLines(output, color.yellow));
};

const error = (...messages: Array<string>) => {
  const output = formatMessages(messages);
  clackLog.error(mapLines(output, color.red));
};

const log = (...messages: Array<string>) => {
  const output = formatMessages(messages);
  clackLog.step(output);
};

const debug = (...messages: Array<unknown>) => {
  if (verbose) {
    const output = formatMessages(messages);
    clackLog.message(mapLines(output, color.dim), {
      symbol: color.dim(SYMBOL_DEBUG),
    });
  }
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
