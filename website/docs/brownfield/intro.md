# Integrating with Native Apps

React Native Enterprise Framework packages your React Native code into native libraries that you can easily integrate into your existing iOS and Android apps. This allows us to achieve a more pleasant experience for native and React Native developers in brownfield setups:

- No need to set up Node.js in your main app
- No need to configure CocoaPods for iOS
- Simple integration using the [React Native Brownfield](https://github.com/callstack/react-native-brownfield) library

## What it does

- **For Android**: Creates an `.aar` file that you can add to your app like any other library
- **For iOS**: Creates an `.xcframework` file that you can add to your app like any other library

## Get started

Choose your platform to begin:

- [Android Integration](./android.md) - Add React Native to your Android app
- [iOS Integration](./ios.mdx) - Add React Native to your iOS app
