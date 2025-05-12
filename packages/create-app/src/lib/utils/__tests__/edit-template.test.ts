import { describe, expect, it } from 'vitest';
import { transformKebabCaseToPascalCase } from '../edit-template.js';

describe('transformKebabCaseToPascalCase', () => {
  it('handles base cases', () => {
    expect(transformKebabCaseToPascalCase('hello')).toBe('Hello');
    expect(transformKebabCaseToPascalCase('hello-world')).toBe('HelloWorld');
    expect(transformKebabCaseToPascalCase('hello-world-long-name')).toBe(
      'HelloWorldLongName'
    );
  });

  it('preserves uppercase letters', () => {
    expect(transformKebabCaseToPascalCase('hello-WORLD')).toBe('HelloWORLD');
  });

  it('should handle edge cases', () => {
    expect(transformKebabCaseToPascalCase('')).toBe('');
    expect(transformKebabCaseToPascalCase('-')).toBe('');
    expect(transformKebabCaseToPascalCase('--')).toBe('');
  });
});
