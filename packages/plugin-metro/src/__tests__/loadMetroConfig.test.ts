import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import loadMetroConfig from '../lib/start/loadMetroConfig.js';

const root = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
  'no-config',
);

const ctx = {
  root,
  reactNativeVersion: '0.86.0',
  reactNativePath: path.join(root, 'node_modules', 'react-native'),
  platforms: { ios: {}, android: {} },
};

describe('loadMetroConfig', () => {
  it('watches the project root and applies CLI options when no metro.config.js exists', async () => {
    const config = await loadMetroConfig(ctx, {
      port: '8088',
      resetCache: true,
      watchFolders: ['/extra/watch/folder'],
    });

    expect(config.projectRoot).toBe(root);
    expect(config.watchFolders).toEqual([root, '/extra/watch/folder']);
    expect(config.server.port).toBe(8088);
    expect(config.resetCache).toBe(true);
    expect(config.resolver.platforms).toEqual(['ios', 'android', 'native']);
  });

  it('applies framework defaults when no metro.config.js exists', async () => {
    const config = await loadMetroConfig(ctx);

    expect(config.resolver.platforms).toEqual(['ios', 'android', 'native']);
    expect(config.serializer.getModulesRunBeforeMainModule).toBeInstanceOf(
      Function,
    );
  });
});
