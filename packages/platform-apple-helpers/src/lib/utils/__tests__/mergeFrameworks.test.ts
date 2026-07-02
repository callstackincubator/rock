import type * as Fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('node:fs');

const fs = await vi.importActual<typeof Fs>('node:fs');

const runXcodebuildMock = vi.fn();

vi.mock('../runXcodebuild.js', () => ({
  runXcodebuild: runXcodebuildMock,
}));

const { mergeFrameworks } = await import('../mergeFrameworks.js');

describe('mergeFrameworks', () => {
  let tempDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'merge-frameworks-test-'));
    runXcodebuildMock.mockReset();
    runXcodebuildMock.mockResolvedValue({ errorSummary: undefined });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('passes through existing framework inputs unchanged', async () => {
    const frameworkPath = path.join(tempDir, 'Brownie.framework');
    fs.mkdirSync(frameworkPath, { recursive: true });

    await mergeFrameworks({
      frameworkPaths: [frameworkPath],
      outputPath: path.join(tempDir, 'Brownie.xcframework'),
      sourceDir: tempDir,
    });

    expect(runXcodebuildMock).toHaveBeenCalledWith(
      [
        '-create-xcframework',
        '-framework',
        frameworkPath,
        '-output',
        path.join(tempDir, 'Brownie.xcframework'),
      ],
      { cwd: tempDir },
    );
  });

  it('sanitizes unresolved umbrella imports in synthesized framework wrappers', async () => {
    const frameworkPath = path.join(tempDir, 'Products', 'ReactBrownfield.framework');
    const buildProductPath = path.dirname(frameworkPath);

    fs.mkdirSync(buildProductPath, { recursive: true });
    fs.writeFileSync(path.join(buildProductPath, 'libReactBrownfield.a'), 'static-lib');
    fs.writeFileSync(
      path.join(buildProductPath, 'ReactBrownfield-umbrella.h'),
      `#import "ReactBrownfield-Swift.h"
#import "BrownfieldDevLoadingViewBridge.h"
#import <ReactBrownfield/ReactNativeBrownfieldModule.h>

FOUNDATION_EXPORT double ReactBrownfieldVersionNumber;
FOUNDATION_EXPORT const unsigned char ReactBrownfieldVersionString[];
`,
    );
    fs.mkdirSync(path.join(buildProductPath, 'Swift Compatibility Header'), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(
        buildProductPath,
        'Swift Compatibility Header',
        'ReactBrownfield-Swift.h',
      ),
      'swift-header',
    );

    runXcodebuildMock.mockImplementation(async (args: string[]) => {
      const generatedFrameworkPath = args[2];
      const umbrellaHeader = fs.readFileSync(
        path.join(
          generatedFrameworkPath,
          'Headers',
          'ReactBrownfield-umbrella.h',
        ),
        'utf8',
      );

      expect(umbrellaHeader).toContain('#import "ReactBrownfield-Swift.h"');
      expect(umbrellaHeader).not.toContain('BrownfieldDevLoadingViewBridge.h');
      expect(umbrellaHeader).not.toContain('ReactNativeBrownfieldModule.h');
      expect(umbrellaHeader).toContain(
        'FOUNDATION_EXPORT double ReactBrownfieldVersionNumber;',
      );

      return { errorSummary: undefined };
    });

    await mergeFrameworks({
      frameworkPaths: [frameworkPath],
      outputPath: path.join(tempDir, 'ReactBrownfield.xcframework'),
      sourceDir: tempDir,
    });
  });

  it('generates a module map without a Swift submodule when no Swift header exists', async () => {
    const frameworkPath = path.join(tempDir, 'Products', 'Brownie.framework');
    const buildProductPath = path.dirname(frameworkPath);

    fs.mkdirSync(buildProductPath, { recursive: true });
    fs.writeFileSync(path.join(buildProductPath, 'libBrownie.a'), 'static-lib');
    fs.writeFileSync(path.join(buildProductPath, 'Brownie-umbrella.h'), 'umbrella');

    runXcodebuildMock.mockImplementation(async (args: string[]) => {
      const generatedFrameworkPath = args[2];
      const generatedModuleMapPath = path.join(
        generatedFrameworkPath,
        'Modules',
        'module.modulemap',
      );

      expect(fs.readFileSync(generatedModuleMapPath, 'utf8')).not.toContain(
        'module Brownie.Swift',
      );

      return { errorSummary: undefined };
    });

    await mergeFrameworks({
      frameworkPaths: [frameworkPath],
      outputPath: path.join(tempDir, 'Brownie.xcframework'),
      sourceDir: tempDir,
    });
  });

});
