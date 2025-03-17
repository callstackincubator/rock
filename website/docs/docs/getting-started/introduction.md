# Introduction

RNEF stands for React Native Enterprise Framework. It's a set of tools to help you ship React Native apps faster on your own infra. Currently these tools are CLI and Remote Cache (implemented together with GitHub Actions currently).

## Why We Exist

On a daily basis at [Callstack](https://callstack.com/), we’re serving clients that usually have large teams, building complex apps for years, accumulating tech debt, becoming slower and slower to iterate, where time is wasted on waiting for builds and onboarding web engineers into intricacies of mobile platforms. According to the [React Native Framework RFC](https://github.com/react-native-community/discussions-and-proposals/pull/759), almost all of these companies are building their own frameworks based on the Community CLI—they just don’t open source them to make them available for everyone, and for good reasons.

As maintainers of the Community CLI, we have quite the exposure to how this tool is used (and misused) in various projects. When we evaluated how our clients use it and what our developers are challenged with, we noticed that these companies encounter similar challenges that they address uniquely:

- High build times with no reuse across CI jobs and dev team
- Months just to integrate a third-party cloud vendor
- A mixed tech stack that makes adding React Native quite a challenge

We also have clients who:

- Ship their products to 10+ platforms
- Have brownfield setups, embedding React Native in their native apps

Using anything other than the Community CLI is not an option for them currently.

**We exist to serve all these needs.**

## Our Principles

We build the framework with a clear focus: to serve large teams and complex apps. These projects require flexibility, the ability to host everything on their own, deploy to as many platforms as possible, and decrease onboarding time. That’s why our engineering design choices focus on:

- **Modular design**—add your supported platforms and plugins, and integrate existing tools; you can build around our framework
- **Self-hosting**—use your own infrastructure without relying on third-party cloud vendors; whether you’re using GitHub Actions or soon Amazon S3 and BitBucket, we got you covered.
- **Incremental adoption**—easily migrate from Community CLI or an existing native app.

## The CLI

We created a new CLI from scratch with a goal in mind to be as easy to migrate from the Community CLI as possible. For most of the projects we try, replacing local build and run experience with our CLI takes up to 10 minutes.

Its core part is modular configuration mechanism allowing for customizing the capabilities (and soon also DX) to your needs through a system of plugins and replaceable parts of the build chain, such as: bundler, platforms, remote cache provider, or helpers exposed through variety of npm packages.

:::info Developer Experience
For the best DX we focus on our CLI to be entrypoint to that system. In the future we imagine you can interact with it through other tools, like Shopify's Tophat, AI agent, or a custom CLI you already have and control.
:::

The CLI takes care of:

- building and running APK and APP files on devices, or simulators
- build APK and APP for different variants and configuration
- creating signed IPA and AAB archives for app stores distribution
- re-signing archives with fresh JS bundles
- providing tools to create a hash of the native projects

### Changes compared to Community CLI

Changed command names:

- `run-android` -> `run:android`
- `build-android` -> `build:android`
- `run-ios` -> `run:ios`
- `build-ios` -> `build:ios`

On top of that we added some new commands which you can read about on the [CLI page](/docs/cli/index)

Changed flags:

- `--mode` to `--variant` for Android commands
- `--mode` to `--configuration` for iOS commands
- `--buildFolder` to `--build-folder` for iOS commands
- `--destination` to `--destinations` for iOS commands
- `--appId` to `--app-id` for Android commands
- `--appIdSuffix` to `--app-id-suffix` for Android commands

Removed flags:

- `--interactive`/`-i` – the CLI will prompt you for input where necessary
- `--list-devices` - when no devices are connected, you'll be prompt with a full device selection

## The Remote Cache

Another core part of the framework, although optional, is Remote Cache. You can think about it as a storage for you native app builds that you can retrieve either manually or through our CLI. This storage can be anything: Amazon S3, Cloudflare R2, Artifacts on your own CI or your custom provider.

:::note
Out of the box we support storing artifacts on GitHub Actions and we're working on more providers.
:::

For every build we calculate a hash (or fingerprint) which represents native state of your project. This hash is stable across builds, unless you make changes to your native files or change dependencies or scripts in package.json. This means that whenever you change the JavaScript part of you app, the hash will stay the same. Effectively allowing you to skip _a lot of builds_ on your local and CI environment.

![How CLI works with remote cache](/cli-remote-cache.png)

We calculate the same hash on your local project. If there's a match between your local project and the build stored remotely, the CLI will download the build for you, so you won't need to build the native project locally.

### The GitHub Actions

Conceptually you can pick your own remote cache provider. Currently we only support GitHub Actions Artifacts. For that very reason we also prepared a set of reusable actions that you can use in your GitHub Workflows.

These actions handle:

- calculating hashes
- building iOS / Android for developers (simulator/emulator builds – APK, APP)
- building iOS / Android for testers (device builds – APK, IPA)
- downloading native artifacts
- uploading native artifacts
- signing iOS with certificates and provisioning profiles (producing IPA)
- signing Android with keystore (producing AAB)
- re-signing the native builds with fresh JS bundles on every PR update

Learn more [here](/docs/remote-cache/github-actions/configuration).
