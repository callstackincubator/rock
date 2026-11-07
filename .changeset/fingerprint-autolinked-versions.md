---
'@rock-js/tools': patch
---

Include the installed version of each autolinked dependency in the native fingerprint. Autolinking reports only package names and paths, and `node_modules` is not hashed, so upgrading a native dependency left the fingerprint unchanged on Android and the remote cache served a build compiled from the previous version.
