import type { Readable } from 'node:stream';
import * as clientS3 from '@aws-sdk/client-s3';
import { fromIni } from '@aws-sdk/credential-provider-ini';
import { fromTemporaryCredentials } from '@aws-sdk/credential-providers';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { RemoteArtifact, RemoteBuildCache } from '@rock-js/tools';

function toWebStream(stream: Readable): ReadableStream {
  return new ReadableStream({
    start(controller) {
      stream.on('data', (chunk) => controller.enqueue(chunk));
      stream.on('end', () => controller.close());
      stream.on('error', (err) => controller.error(err));
    },
  });
}

type ProviderConfig = {
  /**
   * Optional endpoint, necessary for self-hosted S3 servers or Cloudflare R2 integration.
   */
  endpoint?: string;
  /**
   * The bucket name to use for the S3 server.
   */
  bucket: string;
  /**
   * The region of the S3 server.
   */
  region: string;
  /**
   * The access key ID for the S3 server. Not required when using IAM roles or other auth methods.
   */
  accessKeyId?: string;
  /**
   * The secret access key for the S3 server. Not required when using IAM roles or other auth methods.
   */
  secretAccessKey?: string;
  /**
   * The directory to store artifacts in the S3 server.
   */
  directory?: string;
  /**
   * The display name of the provider
   */
  name?: string;
  /**
   * The time in seconds for the presigned URL to expire. By default, it is 24 hours.
   */
  linkExpirationTime?: number;
  /**
   * AWS profile name to use for authentication. Useful for local development.
   */
  profile?: string;
  /**
   * Role ARN to assume for authentication. Useful for cross-account access.
   */
  roleArn?: string;
  /**
   * Session name when assuming a role.
   */
  roleSessionName?: string;
  /**
   * External ID when assuming a role (for additional security).
   */
  externalId?: string;
  /**
   * If true, the provider will not sign requests and will try to access the S3 bucket without authentication.
   */
  publicAccess?: boolean;
  /**
   * ACL to use for the S3 server.
   */
  acl?: clientS3.ObjectCannedACL;
};

export class S3BuildCache implements RemoteBuildCache {
  name = 'S3';
  directory = 'rock-artifacts';
  s3: clientS3.S3Client;
  bucket: string;
  config: ProviderConfig;
  linkExpirationTime: number;

  constructor(config: ProviderConfig) {
    this.config = config;

    const s3Config: clientS3.S3ClientConfig = {
      endpoint: config.endpoint,
      region: config.region,
    };

    if (config.accessKeyId && config.secretAccessKey) {
      s3Config.credentials = {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      };
    } else if (config.roleArn) {
      // Use STS to assume a role
      s3Config.credentials = fromTemporaryCredentials({
        params: {
          RoleArn: config.roleArn,
          RoleSessionName: config.roleSessionName ?? 's3-build-cache-session',
          ExternalId: config.externalId,
        },
        // Optional: use named profile as source credentials
        masterCredentials: config.profile
          ? fromIni({ profile: config.profile })
          : undefined,
      });
    } else if (config.profile) {
      // Use shared config file (e.g. ~/.aws/credentials) with a profile
      s3Config.credentials = fromIni({ profile: config.profile });
    } else if (config.publicAccess) {
      // Workaround to access the S3 bucket without authentication (https://carriagereturn.nl/aws/iam/s3/anonymous/2024/07/31/anonymous-access.html)
      s3Config.signer = {
        sign: async (request) => request,
      };
      s3Config.credentials = {
        accessKeyId: '',
        secretAccessKey: '',
      };
    }

    this.s3 = new clientS3.S3Client(s3Config);

    const awsBucket = config.bucket ?? '';
    const bucketTokens = awsBucket.split('/');
    this.bucket = bucketTokens.shift() as string;
    this.directory = config.directory ?? this.directory;
    this.name = config.name ?? this.name;
    this.linkExpirationTime = config.linkExpirationTime ?? 3600 * 24;
  }

  private async uploadFileWithProgress(
    key: string,
    buffer: Buffer,
    contentType: string | undefined,
    onProgress: (loaded: number, total: number) => void,
  ) {
    const upload = new Upload({
      client: this.s3,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType || 'application/octet-stream',
        ...(this.config.acl && { ACL: this.config.acl }),
        Metadata: {
          createdAt: new Date().toISOString(),
        },
      },
    });

    upload.on('httpUploadProgress', (progress) => {
      if (progress.loaded !== undefined && progress.total !== undefined) {
        onProgress(progress.loaded, progress.total);
      }
    });

    return upload.done();
  }

  async list({
    artifactName,
  }: {
    artifactName?: string;
  }): Promise<RemoteArtifact[]> {
    const artifacts = await this.s3.send(
      new clientS3.ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: artifactName
          ? `${this.directory}/${artifactName}.zip`
          : `${this.directory}/`,
      }),
    );

    const results: RemoteArtifact[] = [];

    for (const artifact of artifacts.Contents ?? []) {
      if (!artifact.Key) continue;

      const name = artifactName ?? artifact.Key.split('/').pop() ?? '';

      const presignedUrl = await getSignedUrl(
        this.s3,
        new clientS3.GetObjectCommand({
          Bucket: this.bucket,
          Key: artifact.Key,
        }),
        { expiresIn: this.linkExpirationTime },
      );

      results.push({ name, url: presignedUrl });
    }

    return results;
  }

  async download({
    artifactName,
  }: {
    artifactName: string;
  }): Promise<Response> {
    try {
      const res = await this.s3.send(
        new clientS3.GetObjectCommand({
          Bucket: this.bucket,
          Key: `${this.directory}/${artifactName}.zip`,
        }),
      );
      return new Response(toWebStream(res.Body as Readable), {
        headers: {
          'content-length': String(res.ContentLength),
        },
      });
    } catch (error) {
      if (this.config.publicAccess) {
        const err = error as Error;
        err.message = `${err.message}\n\nNote: Public access mode is enabled. Build not found or not accessible to the public`;
      }
      throw error;
    }
  }

  async delete({
    artifactName,
    skipLatest,
  }: {
    artifactName: string;
    skipLatest?: boolean;
  }): Promise<RemoteArtifact[]> {
    if (skipLatest) {
      // Artifacts on S3 are unique by name, so skipping latest means we don't delete anything
      // @todo revisit with bucket versioning
      return [];
    }
    await this.s3.send(
      new clientS3.DeleteObjectCommand({
        Bucket: this.bucket,
        Key: `${this.directory}/${artifactName}.zip`,
      }),
    );
    return [
      {
        name: artifactName,
        url: `${this.bucket}/${this.directory}/${artifactName}.zip`,
      },
    ];
  }

  async upload({
    artifactName,
    uploadArtifactName,
  }: {
    artifactName: string;
    uploadArtifactName?: string;
  }): Promise<
    RemoteArtifact & {
      getResponse: (
        buffer: Buffer | ((baseUrl: string) => Buffer),
        contentType?: string,
      ) => Response;
    }
  > {
    const key = uploadArtifactName
      ? `${this.directory}/${uploadArtifactName}`
      : `${this.directory}/${artifactName}.zip`;

    const presignedUrl = await getSignedUrl(
      this.s3,
      new clientS3.GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: this.linkExpirationTime },
    );

    return {
      name: artifactName,
      url: presignedUrl,
      getResponse: (
        buffer: Buffer | ((baseUrl: string) => Buffer),
        contentType?: string,
      ) => {
        const bufferToUpload =
          typeof buffer === 'function'
            ? buffer(presignedUrl.split('?')[0])
            : buffer;

        const readable = new ReadableStream({
          start: (controller) => {
            let lastEmittedBytes = 0;

            try {
              this.uploadFileWithProgress(
                key,
                bufferToUpload,
                contentType,
                (loaded, total) => {
                  const newBytes = loaded - lastEmittedBytes;
                  if (newBytes > 0) {
                    const chunk = bufferToUpload.subarray(
                      lastEmittedBytes,
                      loaded,
                    );
                    controller.enqueue(chunk);
                    lastEmittedBytes = loaded;

                    if (loaded >= total) {
                      controller.close();
                    }
                  }
                },
              );
            } catch (error) {
              controller.error(error);
            }
          },
        });

        return new Response(readable, {
          headers: {
            'content-length': String(bufferToUpload.length),
            'content-type': contentType || 'application/octet-stream',
          },
        });
      },
    };
  }
}

export const providerS3 = (options: ProviderConfig) => (): RemoteBuildCache =>
  new S3BuildCache(options);
