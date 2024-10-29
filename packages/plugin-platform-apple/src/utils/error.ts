// TODO: move to utils package for all plugins.
//

export default class CLIError extends Error {
  constructor(message: string) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

// // Example usage:
// try {
//   throw new CLIError('Invalid command argument', 'INVALID_ARG');
// } catch (error) {
//   if (error instanceof CLIError) {
//     console.error(`${error.name}: ${error.message}`);
//     console.error(`Error Code: ${error.code}`);
//     console.error(`Timestamp: ${error.timestamp}`);
//     console.error(error.stack);
//   }
// }
