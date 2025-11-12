import * as clientS3 from '@aws-sdk/client-s3';
import * as libStorage from '@aws-sdk/lib-storage';
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
    getSignedUrl: vi.fn(
      () =>
        'https://test-bucket.s3.amazonaws.com/rock-artifacts/rock-android-debug-1234567890.zip',
    ),
  };
});

vi.mock('@aws-sdk/lib-storage', () => {
  const Upload = vi.fn().mockImplementation(function Upload(
    this: any,
    _opts: any,
  ) {
    this.on = vi.fn(
      (event: string, cb: (p: { loaded: number; total: number }) => void) => {
        if (event === 'httpUploadProgress') {
          cb({ loaded: 5, total: 10 });
          cb({ loaded: 10, total: 10 });
        }
      },
    );
    this.done = vi.fn(async () => {});
  });
  return { Upload };
});

test('providerS3 implements list method returning an array of artifacts', async () => {
  const mockSend = (clientS3 as any).mockSend;
  mockSend.mockResolvedValueOnce({
    Contents: [
      {
        Key: 'rock-artifacts/rock-android-debug-1234567890.zip',
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
    artifactName: 'rock-android-debug-1234567890',
  });

  expect(clientS3.ListObjectsV2Command).toHaveBeenCalledWith({
    Bucket: 'test-bucket',
    Prefix: 'rock-artifacts/rock-android-debug-1234567890.zip',
  });
  expect(mockSend).toHaveBeenCalled();
  expect(result).toEqual([
    {
      name: 'rock-android-debug-1234567890',
      url: 'https://test-bucket.s3.amazonaws.com/rock-artifacts/rock-android-debug-1234567890.zip',
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
    artifactName: 'rock-android-debug-1234567890',
  });

  expect(clientS3.GetObjectCommand).toHaveBeenCalledWith({
    Bucket: 'test-bucket',
    Key: 'rock-artifacts/rock-android-debug-1234567890.zip',
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
    artifactName: 'rock-android-debug-1234567890',
  });

  expect(clientS3.DeleteObjectCommand).toHaveBeenCalledWith({
    Bucket: 'test-bucket',
    Key: 'rock-artifacts/rock-android-debug-1234567890.zip',
  });
  expect(mockSend).toHaveBeenCalled();
  expect(result).toEqual([
    {
      name: 'rock-android-debug-1234567890',
      url: 'test-bucket/rock-artifacts/rock-android-debug-1234567890.zip',
    },
  ]);
});

test('providerS3 implements upload method', async () => {
  const cacheProvider = providerS3({
    bucket: 'test-bucket',
    region: 'test-region',
    accessKeyId: 'test-access-key-id',
    secretAccessKey: 'test-secret-access-key',
  })();

  const buffer = Buffer.from('test data');
  const { name, url, getResponse } = await cacheProvider.upload({
    artifactName: 'rock-android-debug-1234567890',
  });

  const arrayBuffer = await getResponse(buffer).arrayBuffer();
  const text = new TextDecoder().decode(arrayBuffer);
  expect(text).toBe('test data');

  expect(libStorage.Upload).toHaveBeenCalledWith(
    expect.objectContaining({
      client: expect.any(Object),
      params: expect.objectContaining({
        Bucket: 'test-bucket',
        Key: 'rock-artifacts/rock-android-debug-1234567890.zip',
        Body: buffer,
      }),
    }),
  );

  expect({ name, url }).toEqual({
    name: 'rock-android-debug-1234567890',
    url: 'https://test-bucket.s3.amazonaws.com/rock-artifacts/rock-android-debug-1234567890.zip',
  });
});

test('providerS3 supports R2', async () => {
  const mockSend = (clientS3 as any).mockSend;
  mockSend.mockResolvedValueOnce({
    Contents: [
      {
        Key: 'rock-artifacts-r2/rock-android-debug-1234567890.zip',
        Size: 10000,
        LastModified: new Date(),
      },
    ],
  });
  const cacheProvider = providerS3({
    name: 'R2',
    directory: 'rock-artifacts-r2',
    endpoint: 'https://test-bucket.r2.cloudflarestorage.com',
    bucket: 'test-bucket',
    region: 'test-region',
    accessKeyId: 'test-access-key-id',
    secretAccessKey: 'test-secret-access-key',
  })();

  const result = await cacheProvider.list({
    artifactName: 'rock-android-debug-1234567890',
  });
  expect(cacheProvider.name).toBe('R2');
  expect(clientS3.ListObjectsV2Command).toHaveBeenCalledWith({
    Bucket: 'test-bucket',
    Prefix: 'rock-artifacts-r2/rock-android-debug-1234567890.zip',
  });
  expect(mockSend).toHaveBeenCalled();
  expect(result).toEqual([
    {
      name: 'rock-android-debug-1234567890',
      url: 'https://test-bucket.s3.amazonaws.com/rock-artifacts/rock-android-debug-1234567890.zip',
    },
  ]);
});

test('providerS3 supports public access', async () => {
  (clientS3.S3Client as ReturnType<typeof vi.fn>).mockClear();
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
    region: 'us-east-1',
    publicAccess: true,
  })();

  expect(clientS3.S3Client).toHaveBeenCalledWith(
    expect.objectContaining({
      region: 'us-east-1',
      signer: expect.objectContaining({
        sign: expect.any(Function),
      }),
      credentials: {
        accessKeyId: '',
        secretAccessKey: '',
      },
    }),
  );

  const s3ClientCall = (clientS3.S3Client as ReturnType<typeof vi.fn>).mock
    .calls[0];
  const signer = s3ClientCall[0].signer;
  const mockRequest = { headers: {}, body: 'test' };
  const signedRequest = await signer.sign(mockRequest);
  expect(signedRequest).toBe(mockRequest);

  const response = await cacheProvider.download({
    artifactName: 'public-artifact',
  });

  expect(clientS3.GetObjectCommand).toHaveBeenCalledWith({
    Bucket: 'test-bucket',
    Key: 'rock-artifacts/public-artifact.zip',
  });
  expect(mockSend).toHaveBeenCalled();
  expect(response.headers.get('content-length')).toBe('9');
});
