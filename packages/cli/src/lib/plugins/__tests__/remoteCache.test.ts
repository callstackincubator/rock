import type {
  FingerprintOptions,
  RemoteArtifact,
  RemoteBuildCache,
} from '@rock-js/tools';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { remoteCache } from '../remoteCache.js';

const fingerprint = '7af554b93cd696ca95308fdebe3a4484001bb7b4';
const artifactName = `rock-android-Adhoc-${fingerprint}`;
const fingerprintOptions: FingerprintOptions = {
  extraSources: [],
  ignorePaths: [],
  env: [],
};

const formatArtifactName = vi.hoisted(() => vi.fn());

vi.mock('@rock-js/tools', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...(original as Record<string, unknown>),
    formatArtifactName,
  };
});

function createRemoteCacheProvider(artifacts: RemoteArtifact[], name = 'S3') {
  const list = vi.fn().mockResolvedValue(artifacts);
  const remoteBuildCache: RemoteBuildCache = {
    name,
    list,
    download: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
  };

  return {
    list,
    remoteCacheProvider: () => remoteBuildCache,
  };
}

beforeEach(() => {
  formatArtifactName.mockResolvedValue(artifactName);
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('remote-cache status', () => {
  describe.each(['GitHub', 'S3'])('%s provider', (providerName) => {
    test('reports a cache hit as JSON', async () => {
      const artifact = {
        name: artifactName,
        url: 'https://example.com/artifact.zip',
      };
      const { list, remoteCacheProvider } = createRemoteCacheProvider(
        [artifact],
        providerName,
      );

      await remoteCache({
        action: 'status',
        args: {
          platform: 'android',
          traits: ['Adhoc'],
          json: true,
        },
        remoteCacheProvider,
        projectRoot: '/project',
        fingerprintOptions,
      });

      expect(list).toHaveBeenCalledWith({ artifactName, limit: 1 });
      expect(console.log).toHaveBeenCalledWith(
        JSON.stringify(
          {
            provider: providerName,
            fingerprint,
            artifactName,
            hit: true,
            artifact,
          },
          null,
          2,
        ),
      );
    });

    test('reports a cache miss as JSON', async () => {
      const { remoteCacheProvider } = createRemoteCacheProvider(
        [],
        providerName,
      );

      await remoteCache({
        action: 'status',
        args: {
          platform: 'android',
          traits: ['Adhoc'],
          json: true,
        },
        remoteCacheProvider,
        projectRoot: '/project',
        fingerprintOptions,
      });

      expect(console.log).toHaveBeenCalledWith(
        JSON.stringify(
          {
            provider: providerName,
            fingerprint,
            artifactName,
            hit: false,
            artifact: null,
          },
          null,
          2,
        ),
      );
    });
  });

  test('returns when no remote cache provider is configured', async () => {
    await expect(
      remoteCache({
        action: 'status',
        args: {
          platform: 'android',
          traits: ['Adhoc'],
          json: true,
        },
        remoteCacheProvider: null,
        projectRoot: '/project',
        fingerprintOptions,
      }),
    ).resolves.toBeNull();
  });

  test('propagates provider lookup failures', async () => {
    const { list, remoteCacheProvider } = createRemoteCacheProvider([]);
    list.mockRejectedValueOnce(new Error('S3 is unavailable'));

    await expect(
      remoteCache({
        action: 'status',
        args: {
          platform: 'android',
          traits: ['Adhoc'],
          json: true,
        },
        remoteCacheProvider,
        projectRoot: '/project',
        fingerprintOptions,
      }),
    ).rejects.toThrow('S3 is unavailable');
  });

  test('requires platform and traits', async () => {
    const { remoteCacheProvider } = createRemoteCacheProvider([]);

    await expect(
      remoteCache({
        action: 'status',
        args: {
          name: artifactName,
          json: true,
        },
        remoteCacheProvider,
        projectRoot: '/project',
        fingerprintOptions,
      }),
    ).rejects.toThrow(
      'The "status" action requires "--platform" and "--traits".',
    );
  });
});
