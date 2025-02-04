import { RnefError } from '../error.js';

test('RnefError basic features', () => {
  const error = new RnefError('test');
  expect(error.name).toBe('RnefError');
  expect(error instanceof Error).toBe(true);
  expect(error.stack).toBeDefined();
});
