import { describe, it, expect } from 'vitest';
import unixifyPaths from '../unixifyPaths.js';

describe('unixifyPaths', () => {
  it('should remove Windows drive letter prefix', () => {
    expect(unixifyPaths('C:/Users/test')).toBe('/Users/test');
    expect(unixifyPaths('D:/Projects/app')).toBe('/Projects/app');
    expect(unixifyPaths('Z:/root/folder')).toBe('/root/folder');
  });

  it('should remove current directory (./) prefix', () => {
    expect(unixifyPaths('./src/components')).toBe('src/components');
    expect(unixifyPaths('./package.json')).toBe('package.json');
    expect(unixifyPaths('./test/fixtures')).toBe('test/fixtures');
  });

  it('should leave Unix paths unchanged', () => {
    expect(unixifyPaths('/usr/local/bin')).toBe('/usr/local/bin');
    expect(unixifyPaths('/home/user/docs')).toBe('/home/user/docs');
    expect(unixifyPaths('src/components')).toBe('src/components');
  });

  it('should handle empty paths', () => {
    expect(unixifyPaths('')).toBe('');
  });

  it('should handle paths with multiple slashes', () => {
    expect(unixifyPaths('C://Users//test')).toBe('//Users//test');
    expect(unixifyPaths('.//src//components')).toBe('/src//components');
  });

  it('should handle paths with mixed slashes', () => {
    expect(unixifyPaths('C:/Users\\test')).toBe('/Users\\test');
    expect(unixifyPaths('.\\src/components')).toBe('.\\src/components');
  });

  it('should handle lowercase drive letters', () => {
    expect(unixifyPaths('c:/Users/test')).toBe('/Users/test');
    expect(unixifyPaths('d:/Projects/app')).toBe('/Projects/app');
  });

  it('should preserve paths without drive letter or ./ prefix', () => {
    expect(unixifyPaths('Users/test')).toBe('Users/test');
    expect(unixifyPaths('Projects/app')).toBe('Projects/app');
    expect(unixifyPaths('../parent/folder')).toBe('../parent/folder');
  });

  it('should handle paths starting with multiple dots', () => {
    expect(unixifyPaths('../src/components')).toBe('../src/components');
    expect(unixifyPaths('../../src/components')).toBe('../../src/components');
  });
});
