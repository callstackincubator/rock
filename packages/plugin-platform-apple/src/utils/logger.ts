const info = (message: string) => {
  console.log('info:', message);
};

const debug = (message: string) => {
  console.log('debug:', message);
};

const warn = (message: string) => {
  console.warn(message);
};

const error = (message: string) => {
  console.error(message);
};

const success = (message: string) => {
  console.log('success:', message);
};

const isVerbose = () => {
  return false;
};

export { warn, info, debug, error, success, isVerbose };
