<a href="https://www.callstack.com/open-source?utm_campaign=generic&utm_source=github&utm_medium=referral&utm_content=rock" align="center">
  <picture>
    <img alt="Rock" src="banner.jpg">
  </picture>
</a>
<p align="center">
  🪨 Rock is a cross-platform React Native app development and build toolchain built for modularity, build reuse, and incremental adoption. It integrates seamlessly with your existing infrastructure, giving you complete control without vendor lock-in.
</p>

---

## React Native at scale is challenging

Enterprise apps aren't built overnight. As maintainers of the Community CLI and partners to enterprise teams, we've seen the real challenges: high build times, difficulty adopting new third-party cloud services, and high barriers to introducing React Native into existing iOS and Android apps.

Rock simplifies native build setup and reuse. In most React Native codebases, only about 10% of code changes affect the native iOS/Android files. Yet most teams rebuild their native apps constantly—on every commit, PR, or merge to main—when it's completely unnecessary.

Rock leverages this insight by providing intelligent caching in your cloud infrastructure, seamlessly integrated through its CLI. This allows you to skip up to 90% of unnecessary native builds.

## Features

**🖥️ Brand New CLI**  
A familiar CLI experience with end-to-end development and build workflows. Migrate in seconds with `npm create rock`.

**☁️ Reusable Cloud Builds**  
Reliable caching of native artifacts (APK, IPA) that you can store wherever you prefer, or use our out-of-the-box integrations with GitHub, S3, and R2.

**🔧 GitHub Actions**  
Complete logic for downloading, uploading, and building native artifacts for iOS (APP, IPA) and Android (APK, AAB).

**🔗 Plug-and-Play Brownfield**  
Package your React Native app as a framework and integrate it into your iOS and Android apps just like any other library.

**📦 Bundler Flexibility**  
Rock supports both Metro and Re.Pack for JavaScript bundling. With Re.Pack, you can build Super Apps and Mobile Microfrontends.

**🔌 Extensible Plugin System**  
Built with modularity in mind, Rock allows you to extend its capabilities through plugins that integrate with both the CLI and native templates.

## Installation

Rock is designed for incremental adoption. Whether you're just starting with React Native in your iOS or Android app, or want to migrate from the React Native Community CLI, you can do it step-by-step without having to figure everything out at once.

### Migrating an existing Community CLI project

To migrate an existing project, open a terminal in your project root and run:

```shell
npm create rock
```

### Creating a new project

To create a fresh React Native app with Rock, open a terminal and run:

```shell
npm create rock
```

### Adding to an existing native project

To add React Native to an existing iOS or Android app with Rock, use our Brownfield plugins:

```shell
npm create rock
# ...
◆  What plugins do you want to start with?
│  ◼ brownfield-ios
│  ◼ brownfield-android
```

For detailed instructions, please follow our [Integrating with Native Apps](https://rockjs.dev/docs/brownfield/intro) documentation.

## Documentation

Visit [rockjs.dev](https://rockjs.dev) to learn more about the framework, why we created it, how it can be useful to you, and how to use it in more advanced scenarios.

## Contributing

Read our [contributing guidelines](CONTRIBUTING.md) to learn how you can contribute with bug reports, documentation, and code.

## Made with ❤️ at Callstack

Rock is an open source project and will always remain free to use. If you think it's cool, please star it 🌟. [Callstack](https://www.callstack.com/?utm_source=github.com&utm_medium=referral&utm_campaign=rock&utm_term=readme-with-love) is a group of React and React Native geeks. Contact us at [hello@callstack.com](mailto:hello@callstack.com) if you need any help with these technologies or just want to say hi!
