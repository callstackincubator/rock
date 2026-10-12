import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  buildApp: vi.fn(),
  copyHermesXcframework: vi.fn(),
  copyReactXcframeworks: vi.fn(),
  existsSync: vi.fn(),
  mergeFrameworks: vi.fn(),
}));

vi.mock('node:fs', () => ({
  default: { existsSync: mocks.existsSync },
}));

vi.mock('@rock-js/platform-apple-helpers', () => ({
  buildApp: mocks.buildApp,
  genericDestinations: {
    ios: {
      device: 'generic/platform=iOS',
      simulator: 'generic/platform=iOS Simulator',
    },
  },
  getBuildOptions: vi.fn(() => []),
  getBuildPaths: vi.fn(() => ({
    derivedDataDir: '/derived-data',
    packageDir: '/package',
  })),
  getValidProjectConfig: vi.fn(() => ({ sourceDir: '/project/ios' })),
  mergeFrameworks: mocks.mergeFrameworks,
}));

vi.mock('@rock-js/tools', () => ({
  colorLink: vi.fn((value: string) => value),
  intro: vi.fn(),
  logger: { log: vi.fn(), setVerbose: vi.fn() },
  outro: vi.fn(),
  relativeToCwd: vi.fn((value: string) => value),
  RockError: class RockError extends Error {},
}));

vi.mock('../lib/copyHermesXcframework.js', () => ({
  copyHermesXcframework: mocks.copyHermesXcframework,
}));

vi.mock('../lib/copyReactXcframeworks.js', () => ({
  copyReactXcframeworks: mocks.copyReactXcframeworks,
}));

const { packageIosAction } = await import('../lib/pluginBrownfieldIos.js');

const context = {
  projectRoot: '/project',
  reactNativePath: '/project/node_modules/react-native',
  reactNativeVersion: '0.86.0',
  usePrebuiltRNCore: false,
};

describe('packageIosAction destinations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.buildApp.mockResolvedValue({
      appPath: '/derived-data/Build/Products/Debug/Brownie.app',
      scheme: 'Brownie',
    });
    mocks.mergeFrameworks.mockResolvedValue(undefined);
  });

  it('packages only the simulator slice when a simulator is requested', async () => {
    mocks.existsSync.mockImplementation((filePath: string) =>
      filePath.includes('Debug-iphonesimulator'),
    );

    await packageIosAction(
      {
        destination: ['simulator'],
        installPods: true,
        newArch: true,
      },
      context,
    );

    expect(mocks.mergeFrameworks).toHaveBeenNthCalledWith(1, {
      sourceDir: '/project/ios',
      frameworkPaths: [
        path.join(
          '/derived-data/Build/Products/Debug-iphonesimulator',
          'Brownie.framework',
        ),
      ],
      outputPath: '/package/Brownie.xcframework',
    });
    expect(mocks.mergeFrameworks).toHaveBeenNthCalledWith(2, {
      sourceDir: '/project/ios',
      frameworkPaths: [
        path.join(
          '/derived-data/Build/Products/Debug-iphonesimulator/ReactBrownfield',
          'ReactBrownfield.framework',
        ),
      ],
      outputPath: '/package/ReactBrownfield.xcframework',
    });
  });

  it('uses the available slice for destinations that do not identify an SDK', async () => {
    mocks.existsSync.mockImplementation((filePath: string) =>
      filePath.includes('Debug-iphoneos'),
    );

    await packageIosAction(
      {
        destination: ['id=00008110-0012345678901234'],
        installPods: true,
        newArch: true,
      },
      context,
    );

    expect(mocks.mergeFrameworks).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        frameworkPaths: [
          '/derived-data/Build/Products/Debug-iphoneos/Brownie.framework',
        ],
      }),
    );
  });

  it('reports the searched paths when no framework product was built', async () => {
    mocks.existsSync.mockReturnValue(false);

    await expect(
      packageIosAction(
        {
          destination: ['device'],
          installPods: true,
          newArch: true,
        },
        context,
      ),
    ).rejects.toThrow(
      'Could not find a build product for Brownie in the Debug configuration',
    );

    expect(mocks.mergeFrameworks).not.toHaveBeenCalled();
  });

  it('reports when the build does not resolve a framework scheme', async () => {
    mocks.buildApp.mockResolvedValue({
      appPath: '/derived-data/Build/Products/Debug/Brownie.app',
      scheme: undefined,
    });

    await expect(
      packageIosAction(
        {
          destination: ['device'],
          installPods: true,
          newArch: true,
        },
        context,
      ),
    ).rejects.toThrow(
      'Could not determine the framework name. Pass --scheme with your brownfield framework scheme.',
    );

    expect(mocks.mergeFrameworks).not.toHaveBeenCalled();
  });
});
