# @rock-js/provider-s3

AWS S3 remote cache provider for Rock. This package is part of the Rock ecosystem.

## Features

- Compatible with AWS S3 and Cloudflare R2
- Supports custom endpoints for self-hosted S3-compatible storage
- Secure credential handling

## Configuration

The provider accepts the following configuration options:

```typescript
type ProviderConfig = {
  /**
   * Optional endpoint, necessary for self-hosted S3 servers or Cloudflare R2 integration
   */
  endpoint?: string;
  /**
   * The bucket name to use for the S3 server
   */
  bucket: string;
  /**
   * The region of the S3 server
   */
  region: string;
  /**
   * The access key ID for the S3 server
   */
  accessKeyId: string;
  /**
   * The secret access key for the S3 server
   */
  secretAccessKey: string;
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
};
```

## Usage Examples

### AWS S3

```ts
// rock.config.mjs
import { providerS3 } from '@rock-js/provider-s3';

export default {
  // ...
  remoteCacheProvider: providerS3({
    bucket: 'your-bucket',
    region: 'your-region',
    accessKeyId: 'access-key',
    secretAccessKey: 'secret-key',
  }),
};
```

### Cloudflare R2

```ts
// rock.config.mjs
import { providerS3 } from '@rock-js/provider-s3';

export default {
  // ...
  remoteCacheProvider: providerS3({
    name: 'R2' // optional to display R2 instead of S3
    endpoint: 'https://${ACCOUNT_ID}.r2.cloudflarestorage.com',
    bucket: 'your-bucket',
    region: 'your-region',
    accessKeyId: 'access-key',
    secretAccessKey: 'secret-key',
  }),
};
```

## Documentation

For detailed documentation about Rock and its tools, visit [Rock Documentation](https://rockjs.dev)
