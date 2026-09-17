---
'@rock-js/platform-apple-helpers': patch
---

Harden simulator launching on Xcode 27 Device Hub: fall back to opening `DeviceHub.app` directly if the `devices://` URL scheme is rejected, warn instead of aborting the run when neither `Simulator.app` nor `DeviceHub.app` exists, and stop passing `-CurrentDeviceUDID` to an already booted Simulator.app (which triggers an "Unable to boot device in current state: Booted" alert). Adds tests for `launchSimulator`.
