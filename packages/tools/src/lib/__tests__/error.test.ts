import { RockError } from '../error.js';

test('RockError basic features', () => {
  const error = new RockError('test');
  expect(error.name).toBe('RockError');
  expect(error instanceof Error).toBe(true);
  expect(error.stack).toBeDefined();
});
