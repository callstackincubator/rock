import { expect, test } from 'vitest';
import { ConfigTypeSchema } from '../schema.js';

test('does not allow Joi message localization to pollute Object.prototype', () => {
  const pollutionKey = 'rnefPrototypePollutionRegression';

  try {
    ConfigTypeSchema.messages({
      ['__proto__']: { [pollutionKey]: 'polluted' },
    });

    expect(Object.prototype).not.toHaveProperty(pollutionKey);
  } finally {
    Reflect.deleteProperty(Object.prototype, pollutionKey);
  }
});
