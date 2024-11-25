import color from 'picocolors';
import isUnicodeSupported from 'is-unicode-supported';

const unicode = isUnicodeSupported();
const unicodeWithFallback = (c: string, fallback: string) =>
  unicode ? c : fallback;

const INFO_SYMBOL = unicodeWithFallback('●', '•');
const SUCCESS_SYMBOL = unicodeWithFallback('◆', '*');
const WARN_SYMBOL = unicodeWithFallback('▲', '!');
const ERROR_SYMBOL = unicodeWithFallback('■', 'x');
const SEPARATOR = ', ';

let verbose = false;

const formatMessages = (messages: Array<string>) => messages.join(SEPARATOR);

const success = (...messages: Array<string>) => {
  console.log(
    `${color.green(`${SUCCESS_SYMBOL}  ${formatMessages(messages)}`)}`
  );
};

const info = (...messages: Array<string>) => {
  console.log(`${color.cyan(`${INFO_SYMBOL}  ${formatMessages(messages)}`)}`);
};

const warn = (...messages: Array<string>) => {
  console.warn(
    `${color.yellow(`${WARN_SYMBOL}  ${formatMessages(messages)}`)}`
  );
};

const error = (...messages: Array<string>) => {
  console.error(`${color.red(`${ERROR_SYMBOL}  ${formatMessages(messages)}`)}`);
};

const debug = (...messages: Array<string>) => {
  if (verbose) {
    console.log(`${color.gray('debug')} ${formatMessages(messages)}`);
  }
};

const log = (...messages: Array<string>) => {
  console.log(`${formatMessages(messages)}`);
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
