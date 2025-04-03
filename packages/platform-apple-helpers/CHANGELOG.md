# @rnef/platform-apple-helpers

## 0.5.0

### Minor Changes

- 49e7bc0: feat(ios): brownfield plugin

### Patch Changes

- b0977c8: fix: wrap booting simulator in try catch and add special case for when it says it's booted already
  - @rnef/tools@0.5.0

## 0.4.1

### Patch Changes

- b3cbcab: chore: public release setup
- Updated dependencies [b3cbcab]
  - @rnef/tools@0.4.1

## 0.4.0

### Minor Changes

- ae36943: feat: pass USE_THIRD_PARTY_JSC env variable to pod install

  This change allows passing the USE_THIRD_PARTY_JSC environment variable to the pod install command, enabling configuration of third-party JSC usage in iOS builds.

### Patch Changes

- 5ddc7a7: Adjust the error message if empty stderr from xcodebuild
- cacd767: feat: ios progress bar
- a141247: chore: don't require full build output
- f11cc97: feat: pick Debug configuration when only Debug and Release are available
- 03512fc: Add reading Gemfile file contents to ensure cocoapods are installed
- 6aa1320: Fallback to `pod install` when installing with `bundle exec pod install` fails
- 51a7c7f: Add support for customizing `extraSources` & `ignorePaths`
- feafc80: Add select prompt for destination in interactive environment
- 8e1e2ef: refactor(ios): building, installing and launching apps
- Updated dependencies [51a7c7f]
  - @rnef/tools@0.4.0
