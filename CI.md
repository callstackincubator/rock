# iOS CI Builds

## Simulator

Simulator builds result in a `*.app` _directory_ (also known as a macOS "package"). This requires the GitHub artifact to be first packed as a tarball before being uploaded as an artifact.

Simulator builds do not require signing.

## Device

Device builds result in a `*.ipa` _file_.

### Provisioning Profile

Builds that are to be run on a device must be signed with a Development or Distribution provisioning profile. A Development profile allows for installing on a device through Xcode and is intended for development purposes.

A Provisioning Profile, which can be thought of as a combination of a Certificate and an App ID, describes how the app is installed on a device and what devices are allowed to install it. There are the following types of profiles:

- Development
  - Created with a Development certificate
  - Allows for installing on a device through Xcode
- App Store
  - Created with a Distribution certificate
  - Allows for installing on a device through the App Store/TestFlight
- Ad-Hoc
  - Created with a Distribution certificate
  - Allows for installing on devices registered with the given Apple Developer account and specified in the profile
  - Used for internal testing or small-scale distribution
- Enterprise
  - Created with a Distribution certificate
  - Technically allows for installing on any device, but legally restricted to enterprise employees
  - This type of profile can be created only with an Apple Enterprise Developer account
  - Used for internal distribution and testing

### Certificate

A certificate can be either Development or Distribution. The Development certificate allows for installing on a device through Xcode and is intended for development purposes. The Distribution certificate allows for installing on a device through the App Store/TestFlight, etc.

A certificate has a public and private part. The public part can generally be downloaded from the Apple Developer portal, while the private part is stored on a developer’s machine and needs to be distributed separately (e.g., to other developers or CI).

In order to generate an `*.ipa` file, a developer needs to have both the public and private parts of the certificate on the CI.

#### Installing Apple Certificates on GitHub Actions

See GitHub Actions docs: [Installing an Apple certificate on macOS runners for Xcode development](https://docs.github.com/en/actions/use-cases-and-examples/deploying/installing-an-apple-certificate-on-macos-runners-for-xcode-development)

A modern alternative to the Distribution certificate is the "Distributed Managed" certificate, which is a managed certificate where the private part is stored on Apple’s servers, and Apple actually handles the signing operation.

## Setup for CI

The easiest way to set up CI for iOS device builds (`*.ipa`) is to use manual code signing.

### Manual Code Signing

To set up manual code signing, ensure the following Xcode project settings:

Open Target => Signing & Capabilities => Release (tab)

Make sure that:

- Automatic code signing is unticked
- The Provisioning Profile is set to your distribution profile
- Team & Signing certificate should indicate your designated team & certificate

These correspond to the following \*.xcodeproj/project.pbxproj settings:

- `CODE_SIGN_STYLE = Manual`
- `"DEVELOPMENT_TEAM[sdk=iphoneos*]" = "[Your Apple Team ID]"`
- `"CODE_SIGN_IDENTITY[sdk=iphoneos*]" = "iPhone Distribution"`
- `"PROVISIONING_PROFILE_SPECIFIER[sdk=iphoneos*]" = "[Your Provisioning Profile Name]"`

Also, make sure that the `PRODUCT_BUNDLE_IDENTIFIER` is valid and globally unique (i.e., not used by any other app registered in any other Apple Developer account).

### Local Building

Use Xcode to manually perform Archive and Export operations on the local machine.
After finishing the Xcode export, the output folder should also contain an ExportOptions.plist file, which you should copy to your `ios/` folder and commit to your git repository.

### Running on GitHub Actions

You should export the certificate (including the private key) and provisioning profile as base64 strings, as described in the [GitHub docs](https://docs.github.com/en/actions/use-cases-and-examples/deploying/installing-an-apple-certificate-on-macos-runners-for-xcode-development).

In order to build iOS device builds (`*.ipa`), you need to set up the following secrets on your GitHub repository:

- `RNEF_APPLE_CERTIFICATE_BASE64`
- `RNEF_APPLE_CERTIFICATE_PASSWORD`
- `RNEF_APPLE_PROVISIONING_PROFILE_BASE64`
- `RNEF_APPLE_KEYCHAIN_PASSWORD`

Alternatively, you can use respective input parameters in your `remote-build-ios.yml` workflow:

- `certificate-base64`
- `certificate-password`
- `provisioning-profile-base64`
- `provisioning-profile-name`
- `keychain-password`

Make sure that the `provisioning-profile-name` is the same as the one in your provisioning profile set in the Xcode project (see above).

### Alternative Settings

You can use the `rnef-build-extra-params` input parameter to pass extra parameters to the `rnef build:ios` command, in order to apply custom code signing settings to the `xcodebuild archive` and `xcodebuild -exportArchive` commands.
