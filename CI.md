# iOS CI builds

## Simulator

Simulator build results in `*.app` *directory* (aka macOS "package"). This requires GitHub artifact to be first packed as tarball, before being uploaded as artifact. 

Simulator builds do not require signing.

## Device

Device build results in `*.ipa` *file*.

### Provisioning Profile

Build that are to be run on a device must be signed with a Development or Distribution provisioning profile. Develoment profile allows for installing on a device through Xcode and is intened for development purposes.

Provisioning Profile, which can be tough as Certificate + App ID, describes which on which way the app is installed on a device, and what devices are allowed to install it. There are following types of profiles:

- Development
  - created with Development certificate
  - allows for installing on a device through Xcode
- App Store
  - created with Distribution certificate
  - allows for installing on a device through App Store/Test Flight
- Ad-Hoc
  - created with Distribution certificate
  - allows for installing on devices registered with given Apple Developer account and specified in the profile
  - used for internal testing or small scale distribution
- Enterprise
  - created with Distribution certificate
  - technically allows for installing on any device, but legally restricted to enterprise employees
  - this type of profile can be created only with Apple Enterprise Developer account
  - used for internal distribution & testing

### Certificate

Certifcate can also be either Development or Distribution. Development certificate allows for installing on a device through Xcode and is intened for development purposes. Distribution certificate allows for installing on a device through App Store/Test Flight, etc.

Certificate has a public and private part. Public part can be generally downloaded from Apple Developer portal, while private part is stored on a developer's machine and needs to be distributed separately (e.g. to other developers or CI).

In order to generate an *.ipa file, a developer needs to put both public and private parts of the certificate on the CI.

#### Installing Apple Certificates on GitHub Actions

https://docs.github.com/en/actions/use-cases-and-examples/deploying/installing-an-apple-certificate-on-macos-runners-for-xcode-development

A modern alternative to Distribution certificate is "Distributed Managed" certificate, which is a managed certificate for which private part is stored on Apple's servers and Apple is actually handling the signing operation.


## Setup for CI

The easiest way to setup CI for iOS device builds (*.ipa) is to use manual code signing.

### Code Signing

On order to do that, in Xcode project you need to set up the following:

Open Target => Signing & Capabilities => Release (tab)
Make sure that:
  - Automatic code signing is unticked
  - Provisioning Profile is set to your distribution profile
  - Team & Signing certficate should indicate your designed team & certificate

These correspond to following `*.xcodeproj/project.pbxproj` settings:
- `CODE_SIGN_STYLE = Manual;`
- `"DEVELOPMENT_TEAM[sdk=iphoneos*]" = "[Your Apple Team ID]"`;
- `"CODE_SIGN_IDENTITY[sdk=iphoneos*]" = "iPhone Distribution"`;
- `"PROVISIONING_PROFILE_SPECIFIER[sdk=iphoneos*]" = "[Your Provisioning Profile Name]";`

Also make sure that `PRODUCT_BUNDLE_IDENTIFIER` is valid and globally unique (i.e. not used by any other app registered in any other Apple Developer account).

### Local building

With this settings, running `rnef build:ios` should build and sign a local *.ipa file.

The output folder should also contain `ExportOptions.plist` file, which you should copy to your `ios` folder and commit to your git repository.

### Running on GitHub Actions

You should export the certificate (incl. private key) and provisioning profile as base64 strings, as described in the [GitHub docs](https://docs.github.com/en/actions/use-cases-and-examples/deploying/installing-an-apple-certificate-on-macos-runners-for-xcode-development).

In order build iOS device builds (*.ipa), you need to set up the following secrets on your GitHub repository:

- `RNEF_APPLE_CERTIFICATE_BASE64`
- `RNEF_APPLE_CERTIFICATE_PASSWORD`
- `RNEF_APPLE_PROVISIONING_PROFILE_BASE64`
- `RNEF_APPLE_KEYCHAIN_PASSWORD`

Alternatively, you can respective input parameters in your "remote-build-ios.yml" workflow:

- `certificate-base64`
- `certificate-password`
- `provisioning-profile-base64`
- `provisioning-profile-name`
- `keychain-password`

Make sure that the `provisioning-profile-name` is the same as the one in your provisioning profile set in the Xcode project (see above).

### Alternative settings

You can use `rnef-build-extra-params` input parameter to pass extra parameters to `rnef build:ios` command, in order to apply custom code signing settings to `xcodebuild archive` and `xcodebuild -exportArchive` commands.