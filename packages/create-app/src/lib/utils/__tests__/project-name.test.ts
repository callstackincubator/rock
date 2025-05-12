import { describe, expect, it } from 'vitest';
import { normalizeProjectName } from '../project-name.js';

describe('normalizeProjectName', () => {
  it('handles kebab-case', () => {
    expect(normalizeProjectName('hello')).toBe('Hello');
    expect(normalizeProjectName('hello-world')).toBe('HelloWorld');
    expect(normalizeProjectName('hello-world-long-name')).toBe(
      'HelloWorldLongName'
    );
  });

  it('handles PascalCase', () => {
    expect(normalizeProjectName('Hello')).toBe('Hello');
    expect(normalizeProjectName('HelloWorld')).toBe('HelloWorld');
    expect(normalizeProjectName('HelloWorldLongName')).toBe(
      'HelloWorldLongName'
    );
  });

  it('should handle edge cases', () => {
    expect(normalizeProjectName('')).toBe('');
    expect(normalizeProjectName('-')).toBe('');
    expect(normalizeProjectName('--')).toBe('');
  });
});
