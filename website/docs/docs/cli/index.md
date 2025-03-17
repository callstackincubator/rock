# RNEF CLI

The RNEF CLI allows you to start, develop and build your React Native apps.

Basic usage

```shell title="Terminal"
npx rnef [command] [options]
```

## Reference

The following options are generally available:

| Options             | Description                     |
| ------------------- | ------------------------------- |
| `-h` or `--help`    | Shows all available options     |
| `-V` or `--version` | Outputs the RNEF version number |
| `--verbose`         | Sets verbose logging            |

## Commands

Due to the modular design of RNEF CLI, available commands will depend on your configuration. By default following commands are available for all configurations, and are considered internal (you likely won't need to run them yourself):

| Command       | Description                                     |
| :------------ | :---------------------------------------------- |
| `config`      | Outputs autolinking config (from Community CLI) |
| `fingerprint` | Calculates fingerprint for project or platform  |

More commands, such as for starting a dev server, running or building for a platform are available from the specialized plugins.

Bundler plugins, configured through [`bundler`](/docs/configuration/index#bundlers) property in configuration:

- `@rnef/plugin-metro` – a plugin for Metro bundler which comes with following commands:

  | Command  | Description                   |
  | :------- | :---------------------------- |
  | `start`  | Starts Metro dev server       |
  | `bundle` | Bundles JavaScript with Metro |

- `@rnef/plugin-repack` – a plugin for Re.Pack bundler which comes with following commands:

  | Command  | Description                     |
  | :------- | :------------------------------ |
  | `start`  | Starts Re.Pack dev server       |
  | `bundle` | Bundles JavaScript with Re.Pack |

Platform plugins, configured through [`platform`](/docs/configuration/index#platforms) property in configuration:

- `@rnef/platform-android` – a plugin for Android platform which comes with following commands:

  | Command       | Description                                                     |
  | :------------ | :-------------------------------------------------------------- |
  | run:android   | Runs Android app on emulator or device                          |
  | build:android | Builds Android app for generic emulator, device or distribution |
  | sign:android  | Signs Android app with keystore                                 |

- `@rnef/platform-ios` – a plugin for iOS platform which comes with following commands:

  | Command     | Description                                                  |
  | :---------- | :----------------------------------------------------------- |
  | `build:ios` | Builds iOS app for generic simulator, device or distribution |
  | `run:ios`   | Runs iOS app on simulator or device                          |
  | `sign:ios`  | Signs iOS app with certificate and provisioning profile      |

### `rnef start` options

`rnef start` starts Re.Pack or Metro (depending on `bundler` plugin) dev server whch connects to your apps through a port (by default `8081`) and serve JavaScript in development mode with Hot Module Reloading (HMR), error reporting and more. The following options are available for the `rnef start` command:

| Option                                | Description                                                                                 |
| :------------------------------------ | :------------------------------------------------------------------------------------------ |
| `--port <number>`                     | Port to run the server on (default: 8081)                                                   |
| `--host <string>`                     | Host to run the server on (default: "")                                                     |
| `--projectRoot <path>`                | Path to a custom project root                                                               |
| `--watchFolders <list>`               | Specify any additional folders to be added to the watch list                                |
| `--assetPlugins <list>`               | Specify any additional asset plugins to be used by the packager by full filepath            |
| `--sourceExts <list>`                 | Specify any additional source extensions to be used by the packager                         |
| `--max-workers <number>`              | Specifies the maximum number of workers the worker-pool will spawn for transforming files   |
| `--transformer <string>`              | Specify a custom transformer to be used                                                     |
| `--reset-cache`, `--resetCache`       | Removes cached files                                                                        |
| `--custom-log-reporter-path <string>` | Path to a JavaScript file that exports a log reporter as a replacement for TerminalReporter |
| `--https`                             | Enables https connections to the server                                                     |
| `--key <path>`                        | Path to custom SSL key                                                                      |
| `--cert <path>`                       | Path to custom SSL cert                                                                     |
| `--config <string>`                   | Path to the CLI configuration file                                                          |
| `--no-interactive`                    | Disables interactive mode                                                                   |
| `--client-logs`                       | [Deprecated] Enable plain text JavaScript log streaming for all connected apps              |

### `rnef bundle` options

`rnef bundle` creates an optimized Hermes bytecode (or JavaScript if configured so) bundle for your application. The following options are available for the `rnef bundle` command:

| Option                                  | Description                                                                                          |
| :-------------------------------------- | :--------------------------------------------------------------------------------------------------- |
| `--entry-file <path>`                   | Path to the root JS file, either absolute or relative to JS root                                     |
| `--platform <string>`                   | Either "ios" or "android" (default: "ios")                                                           |
| `--transformer <string>`                | Specify a custom transformer to be used                                                              |
| `--dev [boolean]`                       | If false, warnings are disabled and the bundle is minified (default: true)                           |
| `--minify [boolean]`                    | Allows overriding whether bundle is minified. Defaults to false if dev is true, true if dev is false |
| `--bundle-output <string>`              | File name where to store the resulting bundle, ex. /tmp/groups.bundle                                |
| `--bundle-encoding <string>`            | Encoding the bundle should be written in (default: "utf8")                                           |
| `--max-workers <number>`                | Specifies the maximum number of workers the worker-pool will spawn for transforming files            |
| `--sourcemap-output <string>`           | File name where to store the sourcemap file for resulting bundle, ex. /tmp/groups.map                |
| `--sourcemap-sources-root <string>`     | Path to make sourcemap's sources entries relative to, ex. /root/dir                                  |
| `--sourcemap-use-absolute-path`         | Report SourceMapURL using its full path (default: false)                                             |
| `--assets-dest <string>`                | Directory name where to store assets referenced in the bundle                                        |
| `--unstable-transform-profile <string>` | Experimental, transform JS for a specific JS engine (default: "default")                             |
| `--asset-catalog-dest [string]`         | Path where to create an iOS Asset Catalog for images                                                 |
| `--reset-cache`                         | Removes cached files (default: false)                                                                |
| `--read-global-cache`                   | Try to fetch transformed JS code from the global cache, if configured (default: false)               |
| `--config <string>`                     | Path to the CLI configuration file                                                                   |
| `--resolver-option <string...>`         | Custom resolver options of the form key=value. URL-encoded. May be specified multiple times          |
| `--config-cmd [string]`                 | [Internal] A hack for Xcode build script pointing to wrong bundle command                            |
| `--hermes`                              | Passes the output JS bundle to Hermes compiler and outputs a bytecode file                           |

### `rnef build:ios` options

`rnef build:ios` builds iOS app for generic simulator, device or distribution, producing APP directory for simulators or IPA files for devices and distribution. The following options are available for the `rnef build:ios` command:

| Option                            | Description                                                                                |
| :-------------------------------- | :----------------------------------------------------------------------------------------- |
| `--configuration <string>`        | Xcode scheme configuration (case sensitive)                                                |
| `--scheme <string>`               | Xcode scheme to use                                                                        |
| `--target <string>`               | Xcode target to use                                                                        |
| `--extra-params <string>`         | Custom xcodebuild parameters                                                               |
| `--export-extra-params <string>`  | Custom xcodebuild export archive parameters                                                |
| `--export-options-plist <string>` | Export options file for archiving (default: ExportOptions.plist)                           |
| `--build-folder <string>`         | Location for iOS build artifacts                                                           |
| `--destination <string>`          | Build target: "simulator" or "device"                                                      |
| `--destinations <list>`           | Explicit destinations (e.g., "generic/platform=iphoneos,generic/platform=iphonesimulator") |
| `--archive`                       | Create Xcode archive (IPA)                                                                 |
| `--no-install-pods`               | Skip CocoaPods installation                                                                |
| `--no-new-arch`                   | Build in legacy async architecture                                                         |

### `rnef run:ios` options

`rnef run:ios` runs iOS app on simulator or device. It's an extension of `build:ios`. The following options are available for the `rnef run:ios` command:

| Option                   | Description                               |
| :----------------------- | :---------------------------------------- |
| `--port <number>`        | Bundler port (default: 8081)              |
| `--binary-path <string>` | Path to pre-built .app binary             |
| `--no-remote-cache`      | Disable remote build caching              |
| `--device <string>`      | Device/simulator to use (by name or UDID) |
| `--catalyst`             | Run on Mac Catalyst                       |

### `rnef sign:ios` options

`rnef sign:ios` signs iOS app with certificate and provisioning profile, producing a signed IPA file ready for distribution. The following options are available for the `rnef sign:ios` command:

| Option                | Description                                |
| :-------------------- | :----------------------------------------- |
| `--identity <string>` | Certificate Identity name for code signing |
| `--output <string>`   | Path to output IPA file                    |
| `--build-jsbundle`    | Build JS bundle before signing             |
| `--jsbundle <string>` | Path to JS bundle to apply before signing  |
| `--no-hermes`         | Don't use Hermes for JS bundle             |

### `rnef build:android` options

`rnef build:android` builds Android app for generic emulator, device or distribution, producing APK or AAB files. The following options are available for the `rnef build:android` command:

| Option                   | Description                             |
| :----------------------- | :-------------------------------------- |
| `--variant <string>`     | Build variant (debug/release)           |
| `--aab`                  | Build Android App Bundle instead of APK |
| `--active-arch-only`     | Build only for active architecture      |
| `--tasks <array>`        | Custom Gradle tasks                     |
| `--extra-params <array>` | Extra parameters for Gradle             |

### `rnef run:android` options

`rnef run:android` runs Android app on emulator or device. It's an extension of `build:android`. The following options are available for the `rnef run:android` command:

Same as for `build:android` and:

| Option                     | Description                  |
| :------------------------- | :--------------------------- |
| `--app-id <string>`        | Application ID               |
| `--app-id-suffix <string>` | Application ID suffix        |
| `--no-remote-cache`        | Disable remote build caching |
| `--binary-path <string>`   | Path to pre-built APK        |

### `rnef sign:android` options

`rnef sign:android` signs Android app with keystore, producing a signed APK file ready for distribution. The following options are available for the `rnef sign:android` command:

| Option                         | Description                               |
| :----------------------------- | :---------------------------------------- |
| `--keystore <string>`          | Path to keystore file                     |
| `--keystore-password <string>` | Password for keystore file                |
| `--output <string>`            | Path to output APK file                   |
| `--build-jsbundle`             | Build JS bundle before signing            |
| `--jsbundle <string>`          | Path to JS bundle to apply before signing |
| `--no-hermes`                  | Don't use Hermes for JS bundle            |
