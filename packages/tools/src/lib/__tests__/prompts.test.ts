import { expect, test } from 'vitest';
import { formatStartMessage } from '../prompts.js';

test.each([
  ['Building the app', 'Building the app...'],
  ['Building the app.', 'Building the app...'],
  ['Building the app...', 'Building the app...'],
  ['v1.2 build', 'v1.2 build...'],
  ['...', '...'],
  ['', '...'],
])('formatStartMessage(%j) is %j', (text, expected) => {
  expect(formatStartMessage(text)).toBe(expected);
});

test('formatStartMessage keeps undefined', () => {
  expect(formatStartMessage(undefined)).toBeUndefined();
});

// `/\.+$/` backtracks quadratically on this input (~13s), past the test timeout.
test('formatStartMessage handles long runs of dots', () => {
  const text = `${'.'.repeat(200_000)}x`;
  expect(formatStartMessage(text)).toBe(`${text}...`);
});
