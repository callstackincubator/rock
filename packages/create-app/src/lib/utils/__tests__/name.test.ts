import { describe, expect, it } from 'vitest';
import { transformProjectNameToPascalCase } from '../name.js';

describe('transformProjectNameToPascalCase', () => {
  it('handles kebab-case', () => {
    expect(transformProjectNameToPascalCase('hello')).toBe('Hello');
    expect(transformProjectNameToPascalCase('hello-world')).toBe('HelloWorld');
    expect(transformProjectNameToPascalCase('hello-world-long-name')).toBe(
      'HelloWorldLongName'
    );
  });

  it('handles PascalCase', () => {
    expect(transformProjectNameToPascalCase('Hello')).toBe('Hello');
    expect(transformProjectNameToPascalCase('HelloWorld')).toBe('HelloWorld');
    expect(transformProjectNameToPascalCase('HelloWorldLongName')).toBe(
      'HelloWorldLongName'
    );
  });

  it('should handle edge cases', () => {
    expect(transformProjectNameToPascalCase('')).toBe('');
    expect(transformProjectNameToPascalCase('-')).toBe('');
    expect(transformProjectNameToPascalCase('--')).toBe('');
  });
});
