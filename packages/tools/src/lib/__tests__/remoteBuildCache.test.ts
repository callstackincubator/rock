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
    return { name: artifact.name };
  }
  async delete({ artifact }: { artifact: RemoteArtifact }) {
    if (artifact.name === 'dummy') {
      return true;
    }
    return false;
  }
  async upload({ artifactName }: { artifactName: string }) {
    uploadMock(artifactName);
    return { name: artifactName, url: '/path/to/dummy' };
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
    targetURL: new URL(
      'file:///cache/path/rnef-android-debug-7af554b93cd696ca95308fdebe3a4484001bb7b4'
    ),
  });
  expect(artifact).toEqual({
    name: 'rnef-android-debug-7af554b93cd696ca95308fdebe3a4484001bb7b4',
  });
});

test('dummy remote cache provider deletes artifacts', async () => {
  const remoteBuildCache = await createRemoteBuildCache(
    DummyRemoteCacheProvider
  );
  const result = await remoteBuildCache?.delete({
    artifact: { name: 'dummy', url: '/path/to/dummy' },
  });
  expect(result).toEqual(true);
  const result2 = await remoteBuildCache?.delete({
    artifact: { name: 'dummy2', url: '/path/to/dummy2' },
  });
  expect(result2).toEqual(false);
});

test('dummy remote cache provider uploads artifacts', async () => {
  const remoteBuildCache = await createRemoteBuildCache(
    DummyRemoteCacheProvider
  );
  await remoteBuildCache?.upload({
    artifactName: 'dummy',
  });
  expect(uploadMock).toHaveBeenCalledWith('dummy');
});
