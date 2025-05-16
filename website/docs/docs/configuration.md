# Configuration

RNEF can be configured through a configuration object that defines various aspects of your project setup.

The most basic configuration would, assuming you only support iOS platform and choose Metro as our bundler, would look like this:

```js title="rnef.config.mjs"
// @ts-check
import { platformIOS } from '@rnef/platform-ios';
import { pluginMetro } from '@rnef/plugin-metro';

/** @type {import('@rnef/config').Config} */
export default {
  bundler: pluginMetro(),
  platforms: {
    ios: platformIOS(),
  },
};
```

:::info Explicit configuration
It's intentional design decision to explicitly define platforms, bundlers etc, so you can e.g. add more platforms, or replace a bundler with a different one.
:::

## All Configuration Options

```typescript
{
  // Optional: Root directory of your project
  root?: string;

  // Optional: React Native version being used
  reactNativeVersion?: string;

  // Optional: Custom path to React Native in node_modules
  reactNativePath?: string;

  // Optional: Custom bundler plugin
  bundler?: PluginType;

  // Optional: Array of plugins
  plugins?: Array<PluginType>;

  // Optional: Platform-specific configurations
  platforms?: Record<string, PlatformType>;

  // Optional: Additional commands
  commands?: Array<Command>;

  // Optional: Configure remote cache provider. Currently supports: 'github-actions' or null
  remoteCacheProvider?: 'github-actions' | null;

  fingerprint?: {
    // Additional source files/directories to include in fingerprint calculation
    extraSources?: string[];

    // Paths to ignore when calculating fingerprints
    ignorePaths?: string[];
  }
}
```

## Plugins

A plugin is a partially applied function that has access to `api` object of `PluginApi` type:

```ts
type PluginApi = {
  registerCommand: (command: CommandType) => void;
  getProjectRoot: () => string;
  getReactNativeVersion: () => string;
  getReactNativePath: () => string;
  getPlatforms: () => { [platform: string]: object };
  getRemoteCacheProvider: () => SupportedRemoteCacheProviders | undefined;
  getFingerprintOptions: () => {
    extraSources: string[];
    ignorePaths: string[];
  };
};
```

The following configuration options accept plugins: [`plugins`](#plugins), [`platforms`](#platforms), [`bundler`](#bundlers).

A plugin that registers `my-command` command outputing a hello world would look like this:

```ts title="rnef.config.mjs"
const simplePlugin =
  (pluginConfig: SamplePluginConfig) =>
  (api: PluginApi): PluginOutput => {
    api.registerCommand({
      name: 'my-command',
      description: 'My command description',
      action: async (args) => {
        console.log('hello world');
      },
    });
  };

export default {
  plugins: [simplePlugin()],
};
```

## Bundler

Bundler is a plugin that registers commands for running a dev server and bundling final JavaScript or Hermes bytecode.

By default, RNEF ships with two bundler: Metro (`@rnef/plugin-metro`) and Re.Pack (`@rnef/plugin-repack`).

You can configure the bundler like this:

```js title="rnef.config.mjs"
import { pluginMetro } from '@rnef/plugin-metro';

export default {
  // ...
  bundler: pluginMetro(),
};
```

## Platforms

Platform is a plugin that registers platform-specific functionality such as commands to build the project and run it on a device or simulator.

By default, RNEF ships with two platforms: iOS (`@rnef/platform-ios`) and Android (`@rnef/platform-android`).

You can configure the platform like this:

```js title="rnef.config.mjs"
import { platformIOS } from '@rnef/platform-ios';

export default {
  // ...
  platforms: {
    // config is optional; it translates to `project` config from react-native.config.js file
    ios: platformIOS(config),
  },
};
```

## Remote Cache Configuration

One of the key features of RNEF is remote build caching to speed up your development workflow. By remote cache we mean native build artifacts (e.g. APK, or IPA binaries), which are discoverable by the user and available for download. Remote cache can live on any static storage provider, such as S3, R2, or GitHub Artifacts. For RNEF to know how and where to access this cache, you'll need to define `remoteCacheProvider`, which can be either bundled with the framework (such as the one for GitHub Actions) or a custom one that you can provide.

When `remoteCacheProvider` is set, the CLI will:

1. Look at local cache under `.rnef/` directory for builds downloaded from a remote cache.
1. If not found, it will look for a remote build matching your local native project state (a fingerprint).
1. If not found, it will fall back to local build.

### Built-in GitHub Actions provider

RNEF comes with built-in GitHub Actions remote cache provider, which downloads native build artifacts uploaded through [`actions/upload-artifact`](https://github.com/actions/upload-artifact) action from [GitHub Worfklow Artifacts](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/storing-and-sharing-data-from-a-workflow). You can configure it as:

```ts
export default {
  // ...
  remoteCacheProvider: 'github-actions',
};
```

### Custom remote cache provider

You can plug in any remote storage by implementing [`RemoteBuildCache`](https://github.com/callstack/rnef/blob/main/packages/tools/src/lib/build-cache/common.ts#L24) interface. A simplest remote cache provider, that loads artifact from a local directory available on your filesystem, would look like this:

```ts
class DummyLocalCacheProvider {
  name = 'dummy';
  // artifactName is provided by RNEF, and will look like this:
  // - rnef-android-release-7af554b93cd696ca95308fdebe3a4484001bb7b4
  // - rnef-ios-simulator-Debug-04c166be56d916367462fc3cb1f067f8ac4c34d4
  // depending on flags passed to the `run:*` commands
  async list({ artifactName }) {
    const url = new URL(`${artifactName}.zip`, import.meta.url);
    return [{ name: artifactName, url }];
  }
  async download({ artifactName }) {
    const artifacts = await this.list({ artifactName });
    const filePath = artifacts[0].url.pathname;
    const fileStream = fs.createReadStream(filePath);
    return new Response(fileStream);
  }
}

const pluginDummyLocalCacheProvider = (options) => () =>
  new DummyLocalCacheProvider(options);
```

Then pass the `pluginDummyLocalCacheProvider` function called with optional configuration object (in case you need authentication or anything user-specific, such as repository information) as a value of the `remoteCacheProvider` config key:

```ts
export default {
  // ...
  remoteCacheProvider: pluginDummyLocalCacheProvider(),
};
```

Once this is set up, when running `run:*` commands, RNEF will calculate the hash of your native project for said platform, and call the `download` method to resolve the path to the binary that will be installed on a device.

### Opt-out of remote cache

If you only want to use the CLI without the remote cache, and skip the steps `1.` and `2.` and a warning that you're not using a remote provider, you can disable this functionality by setting it to `null`:

```ts
export default {
  // ...
  remoteCacheProvider: null,
};
```

## Fingerprint Configuration

A fingerprint is a representation of your native project in a form of a hash (e.g. `378083de0c6e6bb6caf8fb72df658b0b26fb29ef`). It's calculated every time the CLI is run. When a local fingerprint matches the one that's generated on a remote server, we have a match and can download the project for you instead of building it locally.

The fingerprint configuration helps determine when builds should be cached and invalidated in non-standard settings, e.g. when you have git submodules in your project:

```ts
export default {
  // ...
  fingerprint: {
    extraSources: ['./git-submodule'],
    ignorePaths: ['./temp'],
  },
};
```

The fingerprint calculation uses [`@expo/fingerprint`](https://docs.expo.dev/versions/latest/sdk/fingerprint/) under the hood.

```

```
