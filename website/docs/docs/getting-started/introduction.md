# Introduction

RNEF (React Native Enterprise Framework) is a toolkit designed to accelerate React Native app development for enterprise teams. It provides a CLI and Remote Cache system (currently integrated with GitHub Actions) to make your team's development workflow more efficient.

:::info OK I want to try it!
If you feel like skipping this intro section and try it out in existing Community CLI project, feel free to head over to [Migrating from Community CLI](/docs/getting-started/migrating-from-community-cli) page. Or go to [Quick start](/docs/getting-started/index) to initialize a new project.
:::

## Why We Exist

On a daily basis at [Callstack](https://callstack.com/), we're serving clients that usually have large teams, building complex apps for years, accumulating tech debt, becoming slower and slower to iterate, where time is wasted on waiting for builds and onboarding web engineers into intricacies of mobile platforms. According to the [React Native Framework RFC](https://github.com/react-native-community/discussions-and-proposals/pull/759), almost all of these companies are building their own frameworks based on the Community CLI—they just don't open source them to make them available for everyone, and for good reasons.

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

We build the framework with a clear focus: to serve large teams and complex apps. These projects require flexibility, the ability to host everything on their own, deploy to as many platforms as possible, and decrease onboarding time. That's why our engineering design choices focus on:

- **Modular design**—add your supported platforms and plugins, and integrate existing tools; you can build around our framework
- **Self-hosting**—use your own infrastructure without relying on third-party cloud vendors; whether you're using GitHub Actions or soon Amazon S3 and BitBucket, we got you covered.
- **Incremental adoption**—easily migrate from Community CLI or an existing native app.

## The CLI

We've created a new CLI from scratch with a focus on seamless migration from the Community CLI. Most projects can replace their local build and run experience with our CLI in under 10 minutes.

Its core part is modular configuration mechanism allowing for customizing the capabilities (and soon also DX) to your needs through a system of plugins and replaceable parts of the build chain, such as: bundler, platforms, remote cache provider, or helpers exposed through variety of npm packages.

:::info Developer Experience
For the best DX we focus on our CLI to be entrypoint to that system. In the future we imagine you can interact with it through other tools, like Shopify's Tophat, AI agent, or a custom CLI you already have and control.
:::

### Key Features

The CLI handles all essential build and deployment tasks:

- Building and running APK/APP files on devices and simulators
- Creating builds for different variants and configurations
- Generating signed IPA and AAB archives for app stores
- Re-signing archives with fresh JS bundles
- Generating native project hashes for caching

### Command Changes from Community CLI

We've updated command names:

- `run-android` → `run:android`
- `build-android` → `build:android`
- `run-ios` → `run:ios`
- `build-ios` → `build:ios`

For a complete list of new commands, visit the [CLI page](/docs/cli/index).

### Flag Changes

We've standardized flag naming across platforms:

Android:

- `--mode` → `--variant`
- `--appId` → `--app-id`
- `--appIdSuffix` → `--app-id-suffix`

iOS:

- `--mode` → `--configuration`
- `--buildFolder` → `--build-folder`

### Removed Flags

We've simplified the interface by removing redundant flags:

- `--interactive`/`-i` – CLI now prompts for input when needed
- `--list-devices` – Device selection is now automatic when no devices are connected

## The Remote Cache

The Remote Cache is an optional but powerful feature that speeds up your development workflow. It acts as a centralized storage for native app builds that can be retrieved either manually or through our CLI. The cache can be hosted on various platforms:

- GitHub Actions (currently supported)
- Amazon S3 (coming soon)
- Cloudflare R2 (coming soon)
- Your own CI artifacts
- Custom providers

:::note
Out of the box we support storing artifacts on GitHub Actions and we're working on more providers.
:::

### How It Works

1. For each build, we calculate a unique hash (fingerprint) with [`@expo/fingerprint`](https://docs.expo.dev/versions/latest/sdk/fingerprint/) that represents your project's native state
2. This hash remains stable across builds unless you:
   - Modify native files
   - Change native dependencies
   - Update scripts in package.json
3. When you make JavaScript-only changes, the hash stays the same
4. The CLI checks for matching builds in:
   - Local cache (`.rnef/` directory)
   - Remote storage
   - Falls back to local build if no match is found

![How CLI works with remote cache](/cli-remote-cache.png)

### GitHub Actions Integration

We provide a set of reusable GitHub Actions that handle:

- Build hash calculation
- iOS/Android builds for:
  - Developers (simulator/emulator builds – APK, APP)
  - Testers (device builds – APK, IPA)
- Artifact management (upload/download)
- Code signing:
  - iOS: certificates and provisioning profiles (IPA)
  - Android: keystore (AAB)
- Automatic re-signing of builds with fresh JS bundles on PR updates

Learn more about [GitHub Actions configuration](/docs/remote-cache/github-actions/configuration).
