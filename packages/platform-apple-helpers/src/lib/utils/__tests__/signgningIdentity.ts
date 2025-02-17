import { describe, expect, it } from 'vitest';
import { parseSigningIdentities } from '../signingIdentities.js';

describe('parseSigningIdentities', () => {
  it('should parse valid signing identities output', () => {
    const input = `
      1) 1234567890ABCDEF1234567890ABCDEF12345678 "Apple Development: John Doe (TEAMID1234)"
      2) ABCDEF1234567890ABCDEF1234567890ABCDEF12 "Apple Distribution: Jane Smith (TEAMID5678)"
    `;

    const result = parseSigningIdentities(input);

    expect(result).toEqual([
      {
        hash: '1234567890ABCDEF1234567890ABCDEF12345678',
        name: 'Apple Development: John Doe (TEAMID1234)',
      },
      {
        hash: 'ABCDEF1234567890ABCDEF1234567890ABCDEF12',
        name: 'Apple Distribution: Jane Smith (TEAMID5678)',
      },
    ]);
  });

  it('should handle empty input', () => {
    const result = parseSigningIdentities('');
    expect(result).toEqual([]);
  });

  it('should handle input with invalid lines', () => {
    const input = `
      Invalid line
      1) 1234567890ABCDEF1234567890ABCDEF12345678 "Apple Development: John Doe (TEAMID1234)"
      Another invalid line
    `;

    const result = parseSigningIdentities(input);

    expect(result).toEqual([
      {
        hash: '1234567890ABCDEF1234567890ABCDEF12345678',
        name: 'Apple Development: John Doe (TEAMID1234)',
      },
    ]);
  });
});
