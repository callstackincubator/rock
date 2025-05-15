import { expect, test } from 'vitest';
import type {
  RemoteArtifact,
  RemoteBuildCache,
} from '../build-cache/common.js';
import { createRemoteBuildCache } from '../build-cache/remoteBuildCache.js';

const uploadMock = vi.fn();

class DummyRemoteCacheProvider implements RemoteBuildCache {
  name = 'dummy';
  async list({ artifactName }: { artifactName: string }) {
    return [{ name: artifactName, url: '/path/to/dummy' }];
  }
  async download({ artifact }: { artifact: RemoteArtifact }) {
    return { name: artifact.name, path: artifact.url };
  }
  async delete({ artifactName }: { artifactName: string }) {
    if (artifactName === 'dummy') {
      return true;
    }
    return false;
  }
  async upload({
    artifactPath,
    artifactName,
  }: {
    artifactPath: string;
    artifactName: string;
  }) {
    uploadMock(artifactPath, artifactName);
    return null;
  }
}

test('dummy remote cache provider lists artifacts', async () => {
  const remoteBuildCache = await createRemoteBuildCache(
    DummyRemoteCacheProvider
  );
  const artifacts = await remoteBuildCache?.list({
    artifactName: 'rnef-android-debug-7af554b93cd696ca95308fdebe3a4484001bb7b4',
  });
  expect(artifacts).toEqual([
    {
      name: 'rnef-android-debug-7af554b93cd696ca95308fdebe3a4484001bb7b4',
      url: '/path/to/dummy',
    },
  ]);
});

test('dummy remote cache provider downloads artifacts', async () => {
  const remoteBuildCache = await createRemoteBuildCache(
    DummyRemoteCacheProvider
  );
  const artifact = await remoteBuildCache?.download({
    artifact: {
      name: 'rnef-android-debug-7af554b93cd696ca95308fdebe3a4484001bb7b4',
      url: '/path/to/dummy',
    },
  });
  expect(artifact).toEqual({
    name: 'rnef-android-debug-7af554b93cd696ca95308fdebe3a4484001bb7b4',
    path: '/path/to/dummy',
  });
});

test('dummy remote cache provider deletes artifacts', async () => {
  const remoteBuildCache = await createRemoteBuildCache(
    DummyRemoteCacheProvider
  );
  const result = await remoteBuildCache?.delete({ artifactName: 'dummy' });
  expect(result).toEqual(true);
  const result2 = await remoteBuildCache?.delete({ artifactName: 'dummy2' });
  expect(result2).toEqual(false);
});

test('dummy remote cache provider uploads artifacts', async () => {
  const remoteBuildCache = await createRemoteBuildCache(
    DummyRemoteCacheProvider
  );
  await remoteBuildCache?.upload({
    artifactPath: '/path/to/dummy',
    artifactName: 'dummy',
  });
  expect(uploadMock).toHaveBeenCalledWith('/path/to/dummy', 'dummy');
});
