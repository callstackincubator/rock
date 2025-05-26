import * as clientS3 from '@aws-sdk/client-s3';
import type { RemoteArtifact, RemoteBuildCache } from '@rnef/tools';
import type { Readable } from 'stream';

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
   * The access key ID for the S3 server.
   */
  accessKeyId: string;
  /**
   * The secret access key for the S3 server.
   */
  secretAccessKey: string;
};

export class S3BuildCache implements RemoteBuildCache {
  name = 'S3';
  s3: clientS3.S3Client;
  bucket: string;
  directory = 'rnef-artifacts';
  config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.s3 = new clientS3.S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    const awsBucket = config.bucket ?? '';
    const bucketTokens = awsBucket.split('/');
    this.bucket = bucketTokens.shift() as string;
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
      })
    );
    return (
      artifacts.Contents?.map((artifact) => ({
        name: artifactName ?? artifact.Key?.split('/').pop() ?? '',
        url: `s3://${this.bucket}/${artifact.Key}`,
      })) ?? []
    );
  }

  async download({
    artifactName,
  }: {
    artifactName: string;
  }): Promise<Response> {
    const res = await this.s3.send(
      new clientS3.GetObjectCommand({
        Bucket: this.bucket,
        Key: `${this.directory}/${artifactName}.zip`,
      })
    );
    return new Response(toWebStream(res.Body as Readable), {
      headers: {
        'content-length': String(res.ContentLength),
      },
    });
  }

  async delete({
    artifactName,
  }: {
    artifactName: string;
  }): Promise<RemoteArtifact[]> {
    await this.s3.send(
      new clientS3.DeleteObjectCommand({
        Bucket: this.bucket,
        Key: `${this.directory}/${artifactName}.zip`,
      })
    );
    return [
      {
        name: artifactName,
        url: `s3://${this.bucket}/${this.directory}/${artifactName}.zip`,
      },
    ];
  }

  async upload({
    artifactName,
    buffer,
  }: {
    artifactName: string;
    buffer: Buffer;
  }): Promise<RemoteArtifact> {
    await this.s3.send(
      new clientS3.PutObjectCommand({
        Bucket: this.bucket,
        Key: `${this.directory}/${artifactName}.zip`,
        Body: buffer,
        ContentLength: buffer.length,
        Metadata: {
          createdAt: new Date().toISOString(),
        },
      })
    );
    return {
      name: artifactName,
      url: `s3://${this.bucket}/${this.directory}/${artifactName}.zip`,
    };
  }
}

export const providerS3 = (options: ProviderConfig) => (): RemoteBuildCache =>
  new S3BuildCache(options);
