# Acknowledgements

Rock wouldn’t exist without the work that came before it. We want to thank the teams who pushed forward ideas in React Native builds and developer tooling. Ideas that shaped how we think about speed, reliability, and what a truly modern build system should be.

## RNX Kit

The [@rnx-kit/build](https://github.com/microsoft/rnx-kit/blob/7bf2194df8d5b7978602139cad24db656c3c962d/incubator/build/README.md#L4) command was the initial inspiration for Rock’s remote build system. Our original idea was to enable React Native projects to build in the cloud and cache their results. As we learned, `rnx-kit` explored a different approach to scheduling builds, which led us down a separate path based on fingerprints.

## Expo Fingerprint

Expo’s work on [`@expo/fingerprint`](https://github.com/expo/expo/tree/4991b5e35ad90ef9e022ebd2854f4bf5d88dc50d/packages/%40expo/fingerprint) was foundational for Rock. It introduced the concept of tying a project’s native sources to a unique hash that identifies the resulting binary. That idea directly paved the way for Rock’s remote (and local) build cache, something that [Expo CLI also supports](https://docs.expo.dev/guides/cache-builds-remotely/).

## React Native Community CLI

The [React Native Community CLI](https://github.com/react-native-community/cli) has been a major source of inspiration for Rock’s design, especially since Rock’s founding team also spent years maintaining the CLI. Its configuration system, modular architecture, and clear run/build commands demonstrated what powerful yet extensible tooling could look like. Particularly for projects that need to support non-standard configurations and multiple platforms.

## React Native Brownfield

Callstack’s [React Native Brownfield](https://github.com/callstack/react-native-brownfield) project allowed us to deliver a holistic developer experience for native apps that adopt React Native incrementally. Together with packaging approach Callstack pioneered, it's foundational for Rock's Brownfield support.
