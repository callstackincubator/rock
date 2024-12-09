import { describe, it, test, expect } from 'vitest';
import {
  parsePackageInfo,
  parsePackageManagerFromUserAgent,
} from '../parsers.js';

describe('parsePackageInfo', () => {
  test('handles simple package name: foo', () => {
    const result = parsePackageInfo('foo');
    expect(result).toEqual({
      packageName: 'foo',
      targetDir: 'foo',
    });
  });

  test('handles nested package path: foo/bar', () => {
    const result = parsePackageInfo('foo/bar');
    expect(result).toEqual({
      packageName: 'bar',
      targetDir: 'foo/bar',
    });
  });

  test('handles scoped package name: @scope/foo', () => {
    const result = parsePackageInfo('@scope/foo');
    expect(result).toEqual({
      packageName: '@scope/foo',
      targetDir: '@scope/foo',
    });
  });

  test('handles relative path: ./foo/bar', () => {
    const result = parsePackageInfo('./foo/bar');
    expect(result).toEqual({
      packageName: 'bar',
      targetDir: './foo/bar',
    });
  });

  test('handles absolute path: /root/path/to/foo', () => {
    const result = parsePackageInfo('/root/path/to/foo');
    expect(result).toEqual({
      packageName: 'foo',
      targetDir: '/root/path/to/foo',
    });
  });

  test('trims trailing slashes: foo/bar/', () => {
    const result = parsePackageInfo('foo/bar/');
    expect(result).toEqual({
      packageName: 'bar',
      targetDir: 'foo/bar',
    });
  });
});

describe('parsePackageManagerFromUserAgent', () => {
  it('should return undefined for undefined input', () => {
    expect(parsePackageManagerFromUserAgent(undefined)).toBeUndefined();
  });

  it('should parse npm user agent correctly', () => {
    const npmUserAgent = 'npm/10.1.0 node/v20.8.1 linux x64 workspaces/false';
    const expected = { name: 'npm', version: '10.1.0' };
    expect(parsePackageManagerFromUserAgent(npmUserAgent)).toEqual(expected);
  });

  it('should parse yarn user agent correctly', () => {
    const yarnUserAgent = 'yarn/1.22.21 npm/? node/v20.8.1 linux x64';
    const expected = { name: 'yarn', version: '1.22.21' };
    expect(parsePackageManagerFromUserAgent(yarnUserAgent)).toEqual(expected);
  });

  it('should parse pnpm user agent correctly', () => {
    const pnpmUserAgent = 'pnpm/8.10.5 npm/? node/v20.8.1 linux x64';
    const expected = { name: 'pnpm', version: '8.10.5' };
    expect(parsePackageManagerFromUserAgent(pnpmUserAgent)).toEqual(expected);
  });

  it('should parse bun user agent correctly', () => {
    const bunUserAgent = 'bun/0.5.7 (linux-x64) node/v18.0.0';
    const expected = { name: 'bun', version: '0.5.7' };
    expect(parsePackageManagerFromUserAgent(bunUserAgent)).toEqual(expected);
  });

  it('should handle unknown package managers', () => {
    const unknownUserAgent = 'unknown/1.0.0 node/v16.18.0 linux x64';
    const expected = { name: 'unknown', version: '1.0.0' };
    expect(parsePackageManagerFromUserAgent(unknownUserAgent)).toEqual(
      expected
    );
  });
});
