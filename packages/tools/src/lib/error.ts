export type RockErrorOptions = {
  cause?: unknown;
};

// See:
// - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#custom_error_types
// - https://stackoverflow.com/questions/1382107/whats-a-good-way-to-extend-error-in-javascript
export class RockError extends Error {
  constructor(message: string, { cause }: RockErrorOptions = {}) {
    super(message, { cause }); // Pass the cause to the Error constructor
    this.name = this.constructor.name; // Set the error name
    Error.captureStackTrace(this, this.constructor); // Capture stack trace
  }
}
