import type * as Fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { logger } from '@rock-js/tools';
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

  it('wraps static-library build products into a temporary framework', async () => {
    const frameworkPath = path.join(tempDir, 'Products', 'Brownie.framework');
    const buildProductPath = path.dirname(frameworkPath);
    const staticLibraryPath = path.join(buildProductPath, 'libBrownie.a');
    const umbrellaHeaderPath = path.join(buildProductPath, 'Brownie-umbrella.h');
    const moduleMapPath = path.join(buildProductPath, 'Brownie.modulemap');
    const swiftHeaderPath = path.join(
      buildProductPath,
      'Swift Compatibility Header',
      'Brownie-Swift.h',
    );
    const swiftModuleDir = path.join(buildProductPath, 'Brownie.swiftmodule');
    const publicHeadersDir = path.join(buildProductPath, 'Headers');

    fs.mkdirSync(path.dirname(swiftHeaderPath), { recursive: true });
    fs.mkdirSync(swiftModuleDir, { recursive: true });
    fs.mkdirSync(publicHeadersDir, { recursive: true });
    fs.writeFileSync(staticLibraryPath, 'static-lib');
    fs.writeFileSync(umbrellaHeaderPath, 'umbrella');
    fs.writeFileSync(moduleMapPath, 'named-modulemap');
    fs.writeFileSync(swiftHeaderPath, 'swift-header');
    fs.writeFileSync(path.join(swiftModuleDir, 'arm64.swiftinterface'), 'swift-interface');
    fs.writeFileSync(path.join(publicHeadersDir, 'Brownie.h'), 'public-header');

    runXcodebuildMock.mockImplementation(async (args: string[]) => {
      const generatedFrameworkPath = args[2];
      const headersDir = path.join(generatedFrameworkPath, 'Headers');
      const modulesDir = path.join(generatedFrameworkPath, 'Modules');

      expect(generatedFrameworkPath).toMatch(/Brownie\.framework$/);
      expect(fs.readFileSync(path.join(generatedFrameworkPath, 'Brownie'), 'utf8')).toBe(
        'static-lib',
      );
      expect(
        fs.readFileSync(path.join(headersDir, 'Brownie-umbrella.h'), 'utf8'),
      ).toBe('umbrella');
      expect(
        fs.readFileSync(path.join(headersDir, 'Brownie.modulemap'), 'utf8'),
      ).toBe('named-modulemap');
      expect(fs.readFileSync(path.join(headersDir, 'Brownie.h'), 'utf8')).toBe(
        'public-header',
      );
      expect(
        fs.readFileSync(path.join(headersDir, 'Brownie-Swift.h'), 'utf8'),
      ).toBe('swift-header');
      expect(
        fs.readFileSync(
          path.join(modulesDir, 'Brownie.swiftmodule', 'arm64.swiftinterface'),
          'utf8',
        ),
      ).toBe('swift-interface');
      expect(
        fs.readFileSync(path.join(modulesDir, 'module.modulemap'), 'utf8'),
      ).toContain('framework module Brownie');
      expect(
        fs.readFileSync(path.join(generatedFrameworkPath, 'Info.plist'), 'utf8'),
      ).toContain('dev.rockjs.synthetic.brownie');

      return { errorSummary: undefined };
    });

    await mergeFrameworks({
      frameworkPaths: [frameworkPath],
      outputPath: path.join(tempDir, 'Brownie.xcframework'),
      sourceDir: tempDir,
    });

    const generatedFrameworkPath = runXcodebuildMock.mock.calls[0]?.[0]?.[2];
    expect(generatedFrameworkPath).toBeTruthy();
    expect(fs.existsSync(path.dirname(generatedFrameworkPath))).toBe(false);
  });

  it('backfills umbrella imports from headers found outside the build product path', async () => {
    const frameworkPath = path.join(tempDir, 'Products', 'BrownfieldNavigation.framework');
    const buildProductPath = path.dirname(frameworkPath);
    const externalHeadersDir = path.join(tempDir, 'packages', 'brownfield-navigation', 'ios');

    fs.mkdirSync(externalHeadersDir, { recursive: true });
    fs.mkdirSync(buildProductPath, { recursive: true });
    fs.writeFileSync(path.join(buildProductPath, 'libBrownfieldNavigation.a'), 'static-lib');
    fs.writeFileSync(
      path.join(buildProductPath, 'BrownfieldNavigation-umbrella.h'),
      '#import "NativeBrownfieldNavigation.h"\n',
    );
    fs.writeFileSync(
      path.join(externalHeadersDir, 'NativeBrownfieldNavigation.h'),
      'external-header',
    );

    runXcodebuildMock.mockImplementation(async (args: string[]) => {
      const generatedFrameworkPath = args[2];
      expect(
        fs.readFileSync(
          path.join(
            generatedFrameworkPath,
            'Headers',
            'NativeBrownfieldNavigation.h',
          ),
          'utf8',
        ),
      ).toBe('external-header');

      return { errorSummary: undefined };
    });

    await mergeFrameworks({
      frameworkPaths: [frameworkPath],
      outputPath: path.join(tempDir, 'BrownfieldNavigation.xcframework'),
      sourceDir: path.join(tempDir, 'apps', 'ExampleApp', 'ios'),
    });
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

  it('restores compiled swiftmodule binaries into merged xcframework slices', async () => {
    const frameworkPath = path.join(tempDir, 'Products', 'Brownie.framework');
    const frameworkSwiftModuleDir = path.join(
      frameworkPath,
      'Modules',
      'Brownie.swiftmodule',
    );
    const outputPath = path.join(tempDir, 'Brownie.xcframework');

    fs.mkdirSync(frameworkSwiftModuleDir, { recursive: true });
    fs.writeFileSync(
      path.join(frameworkSwiftModuleDir, 'arm64-apple-ios-simulator.swiftmodule'),
      'compiled-module',
    );

    runXcodebuildMock.mockImplementation(async () => {
      const outputSwiftModuleDir = path.join(
        outputPath,
        'ios-arm64_x86_64-simulator',
        'Brownie.framework',
        'Modules',
        'Brownie.swiftmodule',
      );
      fs.mkdirSync(outputSwiftModuleDir, { recursive: true });
      fs.writeFileSync(
        path.join(outputSwiftModuleDir, 'arm64-apple-ios-simulator.swiftinterface'),
        'interface',
      );

      return { errorSummary: undefined };
    });

    await mergeFrameworks({
      frameworkPaths: [frameworkPath],
      outputPath,
      sourceDir: tempDir,
    });

    expect(
      fs.readFileSync(
        path.join(
          outputPath,
          'ios-arm64_x86_64-simulator',
          'Brownie.framework',
          'Modules',
          'Brownie.swiftmodule',
          'arm64-apple-ios-simulator.swiftmodule',
        ),
        'utf8',
      ),
    ).toBe('compiled-module');
  });

  it('throws when neither the framework nor the matching static library exists', async () => {
    await expect(
      mergeFrameworks({
        frameworkPaths: [path.join(tempDir, 'Products', 'Brownie.framework')],
        outputPath: path.join(tempDir, 'Brownie.xcframework'),
        sourceDir: tempDir,
      }),
    ).rejects.toThrow(
      'Could not resolve framework input for Brownie',
    );

    expect(runXcodebuildMock).not.toHaveBeenCalled();
    expect(logger.success).not.toHaveBeenCalled();
  });

  it('throws when the static-library build products are missing an umbrella header', async () => {
    const buildProductPath = path.join(tempDir, 'Products');

    fs.mkdirSync(buildProductPath, { recursive: true });
    fs.writeFileSync(path.join(buildProductPath, 'libBrownie.a'), 'static-lib');

    await expect(
      mergeFrameworks({
        frameworkPaths: [path.join(buildProductPath, 'Brownie.framework')],
        outputPath: path.join(tempDir, 'Brownie.xcframework'),
        sourceDir: tempDir,
      }),
    ).rejects.toThrow('Could not synthesize framework wrapper for Brownie');

    expect(runXcodebuildMock).not.toHaveBeenCalled();
  });
});
