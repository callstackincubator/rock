---
'@rock-js/plugin-metro': patch
---

Fix dev server failing to resolve the project entry file when no `metro.config.js` exists. The resolved configuration now includes the project root in `watchFolders`, applies CLI options such as `--port` and `--reset-cache`, and carries the framework defaults registered through `@react-native/metro-config`.
