# Prior Art

Rock wouldn’t exist without the work that came before it. We want to thank the teams who pushed forward ideas in React Native builds and developer tooling. Ideas that shaped how we think about speed, reliability, and what a truly modern build system should be.

## Expo Fingerprint and Remote Cache

Expo's [`@expo/fingerprint`](https://github.com/expo/expo/tree/4991b5e35ad90ef9e022ebd2854f4bf5d88dc50d/packages/%40expo/fingerprint) introduced the concept of tying a project's native sources to a unique hash that identifies the resulting binary. Rock's remote and local build cache builds on this idea. Expo's [Fingerprint and Remote Cache implementation with GitHub Actions](https://expo.dev/blog/expo-fingerprint-github-actions) shows how this works in CI/CD pipelines.

## RNX Kit

[RNX Kit](https://github.com/microsoft/rnx-kit) is Microsoft's collection of React Native tooling that includes dependency management, native builds, and better bundling. Their approach to purpose-built tools that address the complexity of React Native engineering and the fast-changing ecosystem influenced our thinking about comprehensive developer tooling.

## Expo CLI

[Expo CLI](https://docs.expo.dev/more/expo-cli/) provide cloud builds and local development tools. We like their developer experience and how they make everything work together, bringing often complex packages and libraries together seamlessly.

## React Native Community CLI

The [React Native Community CLI](https://github.com/react-native-community/cli) influenced Rock's design, especially since Rock's founding team maintained the CLI. Its configuration system, modular architecture, and run/build commands inform Rock's approach to extensible tooling that supports non-standard configurations and multiple platforms.
