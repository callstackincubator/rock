<a href="https://www.callstack.com/open-source?utm_campaign=generic&utm_source=github&utm_medium=referral&utm_content=rock" align="center">
  <picture>
    <img alt="Rock" src="https://github.com/callstack/rock/raw/main/banner.jpg">
  </picture>
</a>
<p align="center">
  🪨 Rock is a modular toolkit for teams building React Native apps. It helps improve build times and developer experience while fitting into your existing workflows and infrastructure.
</p>

---

## Key Features

**☁️ Remote Build Cache**  
Save up to 96% of build time by reusing native artifacts (APK, AAB, APP, IPA) across machines and CI. Use built‑in integrations for GitHub, S3, and R2 or bring your own storage.

**🔗 Brownfield ready**  
Add React Native to existing iOS and Android apps using Rock Brownfield.

**🔌 Modular & Extensible**  
A plugin‑driven architecture that lets you customize platforms, bundlers, cache providers, and more.

**🖥️ Cross‑platform‑ready**  
iOS and Android by default; designed to extend to TVs, macOS, and Windows (coming soon).

**⚡ Easy Community CLI Migration**  
A familiar CLI that helps you develop, run, and build your app. Migrate from Community CLI in minutes.

## Installation

Choose your path based on your current situation:

### Creating a new project

> [!TIP] 
> For **new projects**, we recommend starting with [Expo](https://expo.dev) for the best developer experience and similar remote caching capabilities. Rock is designed for teams who have outgrown the Community CLI.

To create a fresh React Native app with Rock, open a terminal and run:

```shell
npm create rock
```

### Migrating an existing Community CLI project

To migrate an existing project, open a terminal in your project root and run:

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
