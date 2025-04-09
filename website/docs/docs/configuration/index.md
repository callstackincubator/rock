# Configuration

RNEF can be configured through a configuration object that defines various aspects of your project setup.

The most basic configuration would, assuming you only support iOS platform and choose Metro as our bundler, would look like this

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
  bundler?: () => void;

  // Optional: Array of plugins
  plugins?: Array<() => void>;

  // Optional: Platform-specific configurations
  platforms?: Record<string, () => void>;

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
  (pluginConfig = {}) =>
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
    ios: platformIOS(),
  },
};
```

## Remote Cache Configuration

One of the key features of RNEF is remote build caching to speed up your development workflow. When set, the CLI will:

1. Look at local cache under `.rnef/` directory for builds downloaded from a remote cache.
1. If not found, it will look for a remote build matching your local native project state (a fingerprint).
1. If not found, it will fall back to local build.

Currently it's only available as a GitHub Action, for which you can configure it as:

```ts
export default {
  // ...
  remoteCacheProvider: 'github-actions',
};
```

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
