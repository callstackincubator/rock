import type * as fsType from 'node:fs';
import { spawn } from '@rock-js/tools';
import type { Mock } from 'vitest';
import { describe, expect, it, vi } from 'vitest';
import { extractErrorSummary, runXcodebuild } from '../runXcodebuild.js';

// Read fixtures using actual fs before mocking
const actualFs = await vi.importActual<typeof fsType>('node:fs');
const fixture = actualFs.readFileSync(
  new URL('./__fixtures__/xcodebuildErrorOutput', import.meta.url),
  'utf-8',
);
const phaseScriptExecutionFailFixture = actualFs.readFileSync(
  new URL('./__fixtures__/phaseScriptExecutionFail', import.meta.url),
  'utf-8',
);

vi.mock('node:os', () => ({
  default: { tmpdir: vi.fn().mockReturnValue('/tmp') },
  tmpdir: vi.fn().mockReturnValue('/tmp'),
}));

vi.spyOn(Date, 'now').mockReturnValue(2137000000000);

vi.mock('node:fs', async (importOriginal) => ({
  ...(await importOriginal<typeof fsType>()),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

// Strip ANSI escape sequences for consistent snapshots across environments
// eslint-disable-next-line no-control-regex
const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, '');

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

  it('extracts PhaseScriptExecution failure with Metro error', () => {
    const result = extractErrorSummary(phaseScriptExecutionFailFixture);

    expect(stripAnsi(result)).toMatchInlineSnapshot(`
      "Node found at: /Users/thymikee/.nvm/versions/node/v24.6.0/bin/node
      ┌  Compiling JS bundle with Metro

                              ▒▒▓▓▓▓▒▒
                           ▒▓▓▓▒▒░░▒▒▓▓▓▒
                        ▒▓▓▓▓░░░▒▒▒▒░░░▓▓▓▓▒
                       ▓▓▒▒▒▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▓▓
                       ▓▓░░░░░▒▓▓▓▓▓▓▒░░░░░▓▓
                       ▓▓░░▓▓▒░░░▒▒░░░▒▓▒░░▓▓
                       ▓▓░░▓▓▓▓▓▒▒▒▒▓▓▓▓▒░░▓▓
                       ▓▓░░▓▓▓▓▓▓▓▓▓▓▓▓▓▒░░▓▓
                       ▓▓▒░░▒▒▓▓▓▓▓▓▓▓▒░░░▒▓▓
                        ▒▓▓▓▒░░░▒▓▓▒░░░▒▓▓▓▒
                           ▒▓▓▓▒░░░░▒▓▓▓▒
                              ▒▒▓▓▓▓▒▒


       WARN  the transform cache was reset.
                      Welcome to Metro v0.83.3
                    Fast - Scalable - Integrated


      │
      ■  Unexpected error while running "bundle": UnableToResolveError: Unable to resolve module @rock-js/welcome-screen from /Users/thymikee/Developer/Rock83Brownfield/App.tsx: @rock-js/welcome-screen could not be found within the project or in these directories:
      │    node_modules
      │  > 1 | import WelcomeScreen from '@rock-js/welcome-screen';
      │      |                            ^
      │    2 |
      │    3 | export default function App() {
      │    4 |   return <WelcomeScreen />;
      │      at ModuleResolver.resolveDependency (/Users/thymikee/Developer/Rock83Brownfield/node_modules/metro/src/node-haste/DependencyGraph/ModuleResolution.js:172:15)
      │      at DependencyGraph.resolveDependency (/Users/thymikee/Developer/Rock83Brownfield/node_modules/metro/src/node-haste/DependencyGraph.js:252:43)
      │      ... 6 lines matching cause stack trace ...
      │      at async Promise.all (index 0)
      │      at async buildSubgraph (/Users/thymikee/Developer/Rock83Brownfield/node_modules/metro/src/DeltaBundler/buildSubgraph.js:105:3) {
      │    type: 'UnableToResolveError',
      │    originModulePath: '/Users/thymikee/Developer/Rock83Brownfield/App.tsx',
      │    targetModuleName: '@rock-js/welcome-screen',
      │    cause: FailedToResolveNameError: Module does not exist in the Haste module map or in these directories:
      │      /Users/thymikee/Developer/Rock83Brownfield/node_modules
      │      /Users/thymikee/Developer/node_modules
      │      /Users/thymikee/node_modules
      │      /Users/node_modules
      │      /node_modules
      │
      │        at Object.resolve (/Users/thymikee/Developer/Rock83Brownfield/node_modules/metro-resolver/src/resolve.js:197:9)
      │        at ModuleResolver.resolveDependency (/Users/thymikee/Developer/Rock83Brownfield/node_modules/metro/src/node-haste/DependencyGraph/ModuleResolution.js:96:31)
      │        at DependencyGraph.resolveDependency (/Users/thymikee/Developer/Rock83Brownfield/node_modules/metro/src/node-haste/DependencyGraph.js:252:43)
      │        at /Users/thymikee/Developer/Rock83Brownfield/node_modules/metro/src/lib/transformHelpers.js:163:21
      │        at resolveDependencies (/Users/thymikee/Developer/Rock83Brownfield/node_modules/metro/src/DeltaBundler/buildSubgraph.js:43:25)
      │        at visit (/Users/thymikee/Developer/Rock83Brownfield/node_modules/metro/src/DeltaBundler/buildSubgraph.js:81:30)
      │        at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
      │        at async Promise.all (index 2)
      │        at async visit (/Users/thymikee/Developer/Rock83Brownfield/node_modules/metro/src/DeltaBundler/buildSubgraph.js:90:5)
      │        at async Promise.all (index 0) {
      │      dirPaths: [
      │        '/Users/thymikee/Developer/Rock83Brownfield/node_modules',
      │        '/Users/thymikee/Developer/node_modules',
      │        '/Users/thymikee/node_modules',
      │        '/Users/node_modules',
      │        '/node_modules'
      │      ],
      │      extraPaths: []
      │    }
      │  }
      Command PhaseScriptExecution failed with a nonzero exit code

      The following build commands failed:
      PhaseScriptExecution Bundle\\ React\\ Native\\ code\\ and\\ images /Users/thymikee/Developer/Rock83Brownfield/.rock/cache/ios/derivedData/Build/Intermediates.noindex/Rock83Brownfield.build/Release-iphonesimulator/Rock83BrownfieldReact.build/Script-20D164A32D4D82600039A91E.sh (in target 'Rock83BrownfieldReact' from project 'Rock83Brownfield')
      Full log available at: /tmp/.rock-xcodebuild/2137000000000.log"
    `);
  });

  it('captures error and following code snippet', () => {
    const output = `SwiftDriver Test normal arm64 (in target 'Test')
/path/file.swift:10:5: error: cannot find 'foo' in scope
    let x = foo
            ^
/path/file.swift:10:5: note: did you mean 'bar'?
    let x = foo
            ^`;

    expect(stripAnsi(extractErrorSummary(output))).toMatchInlineSnapshot(`
      "/path/file.swift:10:5: error: cannot find 'foo' in scope
          let x = foo
                  ^
          let x = foo
                  ^
      Full log available at: /tmp/.rock-xcodebuild/2137000000000.log"
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

    expect(stripAnsi(extractErrorSummary(output))).toMatchInlineSnapshot(`
      "/path/file1.swift:10:5: error: first error
          code1
              ^

      /path/file2.swift:20:5: error: second error
          code2
              ^
      Full log available at: /tmp/.rock-xcodebuild/2137000000000.log"
    `);
  });

  it('excludes standalone warnings', () => {
    const output = `CompileSwift normal arm64 (in target 'Test')
warning: some warning here
/path/file.swift:10:5: error: some error
    code
        ^`;

    expect(stripAnsi(extractErrorSummary(output))).toMatchInlineSnapshot(`
      "/path/file.swift:10:5: error: some error
          code
              ^
      Full log available at: /tmp/.rock-xcodebuild/2137000000000.log"
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

    expect(stripAnsi(extractErrorSummary(output))).toMatchInlineSnapshot(`
      "/path/file.swift:10:5: error: some error
          code line
              ^
      Full log available at: /tmp/.rock-xcodebuild/2137000000000.log"
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

    expect(stripAnsi(result.errorSummary ?? '')).toMatchInlineSnapshot(`
      "/Users/developer/rock-remote-build-test/ios/RockRemoteBuildTest/AppDelegate.swift:5:19: error: Unable to find module dependency: 'Brownie'
      @_exported import Brownie
                        ^ (in target 'RockRemoteBuildTest' from project 'RockRemoteBuildTest')
      @_exported import Brownie
                        ^ (in target 'RockRemoteBuildTest' from project 'RockRemoteBuildTest')
      Full log available at: /tmp/.rock-xcodebuild/2137000000000.log"
    `);
  });
});
