import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawn } from '@rock-js/tools';
import type { Mock } from 'vitest';
import { describe, expect, it, vi } from 'vitest';
import { extractErrorSummary, runXcodebuild } from '../runXcodebuild.js';

// Read fixture using unmocked fs
vi.unmock('node:fs');
const fixture = fs.readFileSync(
  path.join(__dirname, '__fixtures__', 'xcodebuildErrorOutput'),
  'utf-8',
);

function createMockProcess(output: string, shouldFail: boolean) {
  let consumed = false;
  return {
    [Symbol.asyncIterator]: () => ({
      next: async () => {
        if (consumed) return { done: true as const, value: undefined };
        consumed = true;
        return { done: false as const, value: output };
      },
    }),
    then(onResolve?: (v: void) => unknown, onReject?: (e: unknown) => unknown) {
      return shouldFail
        ? Promise.reject(new Error('exit code 65')).then(onResolve, onReject)
        : Promise.resolve().then(onResolve);
    },
  };
}

describe('extractErrorSummary', () => {
  it('extracts error with code snippet from real fixture', () => {
    const result = extractErrorSummary(fixture);

    // Should contain the error
    expect(result).toContain(
      "error: Unable to find module dependency: 'Brownie'",
    );
    expect(result).toContain('AppDelegate.swift:5:19');
    // Should contain code snippet following the error
    expect(result).toContain('@_exported import Brownie');
    expect(result).toContain('^');
    // Should NOT contain build steps, warnings, etc
    expect(result).not.toContain('SwiftDriver');
    expect(result).not.toContain('note:');
    expect(result).not.toContain('warning:');
    expect(result).not.toContain('ProcessInfoPlistFile');
  });

  it('captures error and following code snippet', () => {
    const output = `SwiftDriver Test normal arm64 (in target 'Test')
/path/file.swift:10:5: error: cannot find 'foo' in scope
    let x = foo
            ^
/path/file.swift:10:5: note: did you mean 'bar'?
    let x = foo
            ^`;

    expect(extractErrorSummary(output)).toMatchInlineSnapshot(`
      "/path/file.swift:10:5: error: cannot find 'foo' in scope
          let x = foo
                  ^"
    `);
  });

  it('handles multiple errors in same build step', () => {
    const output = `CompileSwift normal arm64 (in target 'Test')
/path/file1.swift:10:5: error: first error
    code1
        ^
/path/file2.swift:20:5: error: second error
    code2
        ^`;

    expect(extractErrorSummary(output)).toMatchInlineSnapshot(`
      "/path/file1.swift:10:5: error: first error
          code1
              ^

      /path/file2.swift:20:5: error: second error
          code2
              ^"
    `);
  });

  it('excludes standalone warnings', () => {
    const output = `CompileSwift normal arm64 (in target 'Test')
warning: some warning here
/path/file.swift:10:5: error: some error
    code
        ^`;

    expect(extractErrorSummary(output)).toMatchInlineSnapshot(`
      "/path/file.swift:10:5: error: some error
          code
              ^"
    `);
  });

  it('stops capturing on empty line', () => {
    const output = `SwiftDriver Test normal arm64 (in target 'Test')
/path/file.swift:10:5: error: some error
    code line
        ^

ProcessInfoPlistFile /path/Info.plist (in target 'Test')
    cd /path
    builtin-infoPlistUtility`;

    expect(extractErrorSummary(output)).toMatchInlineSnapshot(`
      "/path/file.swift:10:5: error: some error
          code line
              ^"
    `);
  });

  it('returns empty string when no errors', () => {
    const output = `CompileSwift normal arm64 (in target 'Test')
    cd /path
    /usr/bin/swiftc ...
** BUILD SUCCEEDED **`;

    expect(extractErrorSummary(output)).toBe('');
  });
});

describe('runXcodebuild', () => {
  it('returns undefined errorSummary on successful build', async () => {
    const successOutput = `CompileSwift normal arm64 (in target 'Test')
** BUILD SUCCEEDED **`;

    (spawn as Mock).mockImplementation((file: string, args: string[]) => {
      if (file === 'xcodebuild' && args.includes('-project')) {
        return createMockProcess(successOutput, false);
      }
      return createMockProcess('', false);
    });

    const result = await runXcodebuild(['-project', 'Test.xcodeproj'], {
      reportProgress: false,
    });

    expect(result.errorSummary).toBeUndefined();
  });

  it('extracts errorSummary on failed build', async () => {
    (spawn as Mock).mockImplementation((file: string, args: string[]) => {
      if (file === 'xcodebuild' && args.includes('-workspace')) {
        return createMockProcess(fixture, true);
      }
      return createMockProcess('', false);
    });

    const result = await runXcodebuild(['-workspace', 'Test.xcworkspace'], {
      reportProgress: false,
    });

    expect(result.errorSummary).toMatchInlineSnapshot(`
      "/Users/developer/rock-remote-build-test/ios/RockRemoteBuildTest/AppDelegate.swift:5:19: error: Unable to find module dependency: 'Brownie'
      @_exported import Brownie
                        ^ (in target 'RockRemoteBuildTest' from project 'RockRemoteBuildTest')"
    `);
  });
});
