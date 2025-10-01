# Introduction

Rock is a modular toolkit for teams building React Native apps. It helps improve build times and developer experience while fitting into your existing workflows and infrastructure.

:::tip Ready to get started?
Choose your path: [Getting Started →](/docs/getting-started)
:::

## Who should use Rock

Rock is built for two kinds of teams:

- **Existing React Native teams using Community CLI** who want to improve build times and developer experience while fitting into your existing workflows and infrastructure.
- **iOS/Android native teams** planning to incorporate React Native without disrupting existing workflows: Rock Brownfield lets you add your whole React Native app like any other dependency.

:::info New to React Native and building app from scratch?
For **new projects that aren't brownfield**, consider starting with [Expo](https://expo.dev) for the best developer experience and similar remote caching capabilities. We recommend using [this template](https://github.com/nkzw-tech/expo-app-template) for sensible defaults. Rock is designed for teams who have outgrown the Community CLI.
:::

Both types of teams will benefit from Rock's cross‑platform reach: iOS and Android by default, with a flexible architecture that extends to TVs, macOS, Windows, and HarmonyOS (coming soon).

## Why We Exist

At [Callstack](https://callstack.com/), we work with large teams building complex React Native apps. As maintainers of the Community CLI, we have quite the exposure to how this tool is used in various projects. These teams face similar challenges:

- **Build times** – No reuse of builds across CI jobs and development teams
- **Infrastructure control** – Need to host everything on their own infrastructure
- **Platform diversity** – Shipping to 10+ platforms beyond iOS and Android
- **Brownfield integration** – Embedding React Native in existing native apps
- **Tech stack complexity** – Adding React Native to mixed technology environments

According to the [React Native Framework RFC](https://github.com/react-native-community/discussions-and-proposals/pull/759), many companies build custom frameworks on top of Community CLI to address these needs, but most keep them internal.

**Rock exists to provide a modular, production-ready solution that serves these needs out of the box.**

## Our Principles

Rock is built on three core principles:

- **Modular design** — add your supported platforms and plugins, and integrate existing tools; you can build around our framework
- **Self-hosting** — use your own infrastructure; whether you're using GitHub Actions or Amazon S3 and BitBucket, we got you covered
- **Incremental adoption** — easily migrate from Community CLI or add to an existing native app
