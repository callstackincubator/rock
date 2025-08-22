# create-rock

A CLI tool for creating new Rock projects with customizable templates, platforms, and plugins.

## Usage

```bash
npm create rock
```

## Features

- **Interactive setup** - Guided prompts for project configuration
- **Template system** - Start with pre-configured project templates
- **Platform support** - Add iOS and Android platforms
- **Plugin system** - Extend functionality with plugins
- **Bundler choice** - Choose between Metro and Re.Pack
- **Remote cache** - Configure build caching for faster builds

## Options

- `--template <name>` - Specify template (default: "default")
- `--platforms <platforms>` - Specify platforms (ios, android)
- `--plugins <plugins>` - Specify plugins (brownfield-ios, brownfield-android)
- `--bundler <bundler>` - Specify bundler (metro, repack)
- `--install` - Install dependencies after creation
- `--override` - Override existing directory
- `--help` - Show help information
- `--version` - Show version information

## Examples

```bash
# Create a basic project
npm create rock

# Create with specific platforms
npm create rock --platforms ios android

# Create with brownfield plugins
npm create rock --plugins @rock-js/plugin-brownfield-ios @rock-js/plugin-brownfield-android

# Create with Re.Pack bundler
npm create rock --bundler repack

# Create and install dependencies
npm create rock --install
```

## Available Templates

- **default** - Basic React Native project template

## Available Platforms

- **ios** - iOS platform support
- **android** - Android platform support

## Available Plugins

- **@rock-js/plugin-brownfield-ios** - iOS brownfield integration
- **@rock-js/plugin-brownfield-android** - Android brownfield integration

## Available Bundlers

- **metro** - Metro bundler (default)
- **repack** - Re.Pack bundler for micro-frontends
