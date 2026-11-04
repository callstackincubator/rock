---
'@rock-js/plugin-brownfield-ios': patch
'@rock-js/platform-apple-helpers': patch
---

Preserve relative symlinks when copying XCFrameworks during `package:ios`. `fs.cpSync` rewrote them into absolute paths on the packaging machine, so versioned framework slices (such as the Mac Catalyst slice of `hermesvm.xcframework`) shipped symlinks pointing outside the bundle, which SwiftPM refuses to extract from a binary target archive.
