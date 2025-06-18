import * as clientS3 from '@aws-sdk/client-s3';
import { expect, test, vi } from 'vitest';
import { providerS3 } from '../lib/providerS3.js';

// Mock the AWS S3 client
vi.mock('@aws-sdk/client-s3', () => {
  const mockSend = vi.fn();
  return {
    S3Client: vi.fn(() => ({
      send: mockSend,
    })),
    ListObjectsV2Command: vi.fn(),
    GetObjectCommand: vi.fn(),
    DeleteObjectCommand: vi.fn(),
    PutObjectCommand: vi.fn(),
    mockSend,
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => {
  return {
    getSignedUrl: vi.fn(() => 'https://test-bucket.s3.amazonaws.com/rnef-artifacts/rnef-android-debug-1234567890.zip'),
  };
});

test('providerS3 implements list method returning an array of artifacts', async () => {
  const mockSend = (clientS3 as any).mockSend;
  mockSend.mockResolvedValueOnce({
    Contents: [
      {
        Key: 'rnef-artifacts/rnef-android-debug-1234567890.zip',
        Size: 10000,
        LastModified: new Date(),
      },
    ],
  });

  const cacheProvider = providerS3({
    bucket: 'test-bucket',
    region: 'test-region',
    accessKeyId: 'test-access-key-id',
    secretAccessKey: 'test-secret-access-key',
  })();

  const result = await cacheProvider.list({
    artifactName: 'rnef-android-debug-1234567890',
  });

  expect(clientS3.ListObjectsV2Command).toHaveBeenCalledWith({
    Bucket: 'test-bucket',
    Prefix: 'rnef-artifacts/rnef-android-debug-1234567890.zip',
  });
  expect(mockSend).toHaveBeenCalled();
  expect(result).toEqual([
    {
      name: 'rnef-android-debug-1234567890',
      url: 'https://test-bucket.s3.amazonaws.com/rnef-artifacts/rnef-android-debug-1234567890.zip',
    },
  ]);
});

test('providerS3 implements download method returning a stream with artifact zip', async () => {
  const mockSend = (clientS3 as any).mockSend;
  const mockStream = {
    on: vi.fn((event, callback) => {
      if (event === 'data') callback(Buffer.from('test data'));
      if (event === 'end') callback();
      return mockStream;
    }),
  };
  mockSend.mockResolvedValueOnce({
    Body: mockStream,
    ContentLength: 9,
  });

  const cacheProvider = providerS3({
    bucket: 'test-bucket',
    region: 'test-region',
    accessKeyId: 'test-access-key-id',
    secretAccessKey: 'test-secret-access-key',
  })();

  const response = await cacheProvider.download({
    artifactName: 'rnef-android-debug-1234567890',
  });

  expect(clientS3.GetObjectCommand).toHaveBeenCalledWith({
    Bucket: 'test-bucket',
    Key: 'rnef-artifacts/rnef-android-debug-1234567890.zip',
  });
  expect(mockSend).toHaveBeenCalled();
  expect(response.headers.get('content-length')).toBe('9');
});

test('providerS3 implements delete method', async () => {
  const mockSend = (clientS3 as any).mockSend;
  mockSend.mockResolvedValueOnce({});

  const cacheProvider = providerS3({
    bucket: 'test-bucket',
    region: 'test-region',
    accessKeyId: 'test-access-key-id',
    secretAccessKey: 'test-secret-access-key',
  })();

  const result = await cacheProvider.delete({
    artifactName: 'rnef-android-debug-1234567890',
  });

  expect(clientS3.DeleteObjectCommand).toHaveBeenCalledWith({
    Bucket: 'test-bucket',
    Key: 'rnef-artifacts/rnef-android-debug-1234567890.zip',
  });
  expect(mockSend).toHaveBeenCalled();
  expect(result).toEqual([
    {
      name: 'rnef-android-debug-1234567890',
      url: 'test-bucket/rnef-artifacts/rnef-android-debug-1234567890.zip',
    },
  ]);
});

test('providerS3 implements upload method', async () => {
  const mockSend = (clientS3 as any).mockSend;
  mockSend.mockResolvedValueOnce({});

  const cacheProvider = providerS3({
    bucket: 'test-bucket',
    region: 'test-region',
    accessKeyId: 'test-access-key-id',
    secretAccessKey: 'test-secret-access-key',
  })();

  const buffer = Buffer.from('test data');
  const result = await cacheProvider.upload({
    artifactName: 'rnef-android-debug-1234567890',
    buffer,
  });

  expect(clientS3.PutObjectCommand).toHaveBeenCalledWith({
    Bucket: 'test-bucket',
    Key: 'rnef-artifacts/rnef-android-debug-1234567890.zip',
    Body: buffer,
    ContentLength: buffer.length,
    Metadata: expect.objectContaining({
      createdAt: expect.any(String),
    }),
  });
  expect(mockSend).toHaveBeenCalled();
  expect(result).toEqual({
    name: 'rnef-android-debug-1234567890',
    url: 'https://test-bucket.s3.amazonaws.com/rnef-artifacts/rnef-android-debug-1234567890.zip',
  });
});

test('providerS3 supports R2', async () => {
  const mockSend = (clientS3 as any).mockSend;
  mockSend.mockResolvedValueOnce({
    Contents: [
      {
        Key: 'rnef-artifacts-r2/rnef-android-debug-1234567890.zip',
        Size: 10000,
        LastModified: new Date(),
      },
    ],
  });
  const cacheProvider = providerS3({
    name: 'R2',
    directory: 'rnef-artifacts-r2',
    endpoint: 'https://test-bucket.r2.cloudflarestorage.com',
    bucket: 'test-bucket',
    region: 'test-region',
    accessKeyId: 'test-access-key-id',
    secretAccessKey: 'test-secret-access-key',
  })();

  const result = await cacheProvider.list({
    artifactName: 'rnef-android-debug-1234567890',
  });
  expect(cacheProvider.name).toBe('R2');

  expect(result).toEqual([
    {
      name: 'rnef-android-debug-1234567890',
      url: 'https://test-bucket.s3.amazonaws.com/rnef-artifacts/rnef-android-debug-1234567890.zip',
    },
  ]);
});
