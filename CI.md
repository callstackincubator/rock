# General
## Secrets
To use the RNEF GitHub Actions, you need to set up the secrets on your GitHub repository:
`NPM_TOKEN` and 
platforms specific secrets described below in the iOS and Android sections.

## Change workflow permissions 
Settings -> Actions -> General -> Workflow Permissions -> Read and write permissions

## Generate GitHub Personal Access Token for downloading cached builds 
Generate GitHub Personal Access Token for downloading cached builds at: https://github.com/settings/tokens. Include "repo", "workflow", and "read:org" permissions.
You'll be asked about this token when cached build is available while running the `npx rnef run:` command.

# iOS CI Builds

## Development Builds For Simulators

This action from RNEF builds an APP (`.app`) file in debug configuration suitable for development. Doesn't require signing.

Use in the GitHub Workflow file like this:

```yaml
- name: RNEF Remote Build - iOS simulator
  uses: ./.github/actions/rnef-remote-build-ios
  with:
    destination: simulator
    configuration: Debug
```

## Tester Builds For Devices

This action from RNEF builds an IPA (`.ipa`) file in release variant suitable for testing. Requires signing.

### Prerequisites

Signing an iOS app for distribution requires a certificate, a provisioning profile and an `ExportOptions.plist` file.

#### ExportOptions.plist

Archive and Export operations require an `ExportOptions.plist` file, which specifies the code signing settings for the `xcodebuild archive` and `xcodebuild -exportArchive` commands. If you don't have this file in your project, you can create it manually by exporting an archive from Xcode. Once finished, the output folder should contain an `ExportOptions.plist` file, which you should copy to your `ios/` folder and commit to your git repository.

#### Manual Code Signing

The easiest way to set up CI for iOS device builds is to use manual code signing. To set up manual code signing, ensure the following Xcode project settings:

```
Open Target => Signing & Capabilities => Release (tab)
```

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

#### Provisioning Profile

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

In order to install the provisioning profile on GitHub Actions, you need to export the provisioning profile as a base64 string, as described in the [GitHub docs](https://docs.github.com/en/actions/use-cases-and-examples/deploying/installing-an-apple-certificate-on-macos-runners-for-xcode-development). You can do it using the following command, which will copy the contents to your clipboard:

```bash
base64 -i PROVISIONING_PROFILE.mobileprovision | pbcopy
```

Once created, store it as `RNEF_APPLE_PROVISIONING_PROFILE_BASE64` secret on your GitHub repository.

#### Certificate

A certificate can be either Development or Distribution. The Development certificate allows for installing on a device through Xcode and is intended for development purposes. The Distribution certificate allows for installing on a device through the App Store/TestFlight, etc.

A certificate has a public and private part. The public part can generally be downloaded from the Apple Developer portal, while the private part is stored on a developer’s machine and needs to be distributed separately (e.g., to other developers or CI).

> [!IMPORTANT]
> You need to have access to both the public and private parts of the certificate on the CI to generate an IPA file.

In order to install the certificate on GitHub Actions, you need to export the certificate (including the private key) as a base64 string, as described in the [GitHub docs](https://docs.github.com/en/actions/use-cases-and-examples/deploying/installing-an-apple-certificate-on-macos-runners-for-xcode-development). You can do it using the following command, which will copy the contents to your clipboard:

```bash
base64 -i BUILD_CERTIFICATE.p12 | pbcopy
```

Once created, store it as `RNEF_APPLE_CERTIFICATE_BASE64` secret on your GitHub repository.

> [!NOTE]
> A modern alternative to the Distribution certificate is the "Distributed Managed" certificate, which is a managed certificate where the private part is stored on Apple’s servers, and Apple actually handles the signing operation.

#### GitHub Actions Secrets

In order to build signed iOS device builds, you need to set up the following secrets on your GitHub repository:

- `RNEF_APPLE_CERTIFICATE_BASE64` – Base64 version of the certificate
- `RNEF_APPLE_CERTIFICATE_PASSWORD` – Certificate password
- `RNEF_APPLE_PROVISIONING_PROFILE_BASE64` – Base64 version of the provisioning profile
- `RNEF_APPLE_KEYCHAIN_PASSWORD` – Password to keychain (created temporarily by the GitHub Action)

### Running on GitHub Actions

Use in the GitHub Workflow file like this:

```yaml
- name: RNEF Remote Build - iOS device
  uses: ./.github/actions/rnef-remote-build-ios
  with:
    destination: device
    configuration: Release
    certificate-base64: ${{ secrets.APPLE_BUILD_CERTIFICATE_BASE64 }}
    certificate-password: ${{ secrets.APPLE_BUILD_CERTIFICATE_PASSWORD }}
    provisioning-profile-base64: ${{ secrets.APPLE_BUILD_PROVISIONING_PROFILE_BASE64 }}
    provisioning-profile-name: 'PROVISIONING_PROFILE_NAME'
    keychain-password: ${{ secrets.APPLE_KEYCHAIN_PASSWORD }}
```

Make sure that the `provisioning-profile-name` is the same as the one in your provisioning profile set in the Xcode project (see above).

### Alternative Settings

You can use the `rnef-build-extra-params` input parameter to pass extra parameters to the `rnef build:ios` command, in order to apply custom code signing settings to the `xcodebuild archive` and `xcodebuild -exportArchive` commands.

```yaml
- name: RNEF Remote Build - iOS device
  uses: ./.github/actions/rnef-remote-build-ios
  with:
    destination: device
    rnef-build-extra-params: 'CUSTOM FLAGS AND ENVIRONMENT VARIABLES'
```

# Android CI Builds

## Development Builds For All Devices

This action from RNEF builds an APK (`.apk`) file in debug variants suitable for development. Doesn't require signing.

### Running on GitHub Actions

Use in the GitHub Workflow file like this:

```yaml
- name: RNEF Remote Build - Android
  uses: ./.github/actions/rnef-remote-build-android
  with:
    variant: debug
```

## Tester Builds For All Devices

This action from RNEF builds an APK file in release variants suitable for testing. Requires signing.

### Prerequisites

To build release artifacts, you'll need to export the release.keystore as base64 string, e.g. using the following command:

```bash
base64 -i release.keystore | pbcopy
```

On GitHub Actions secrets and variables page you'll need to set up the following secrets for your GitHub repository:

- `KEYSTORE_BASE64` – Base64 version of the release keystore
- `RNEF_UPLOAD_STORE_FILE` – Keystore store file name
- `RNEF_UPLOAD_STORE_PASSWORD` – Keystore store password
- `RNEF_UPLOAD_KEY_ALIAS` – Keystore key alias
- `RNEF_UPLOAD_KEY_PASSWORD` – Keystore key password

### Running on GitHub Actions

Use in the GitHub Workflow file like this:

```yaml
- name: RNEF Remote Build - Android device
  uses: ./.github/actions/rnef-remote-build-android
  with:
    sign: true
    variant: release
    keystore-base64: ${{ secrets.KEYSTORE_BASE64 }}
    keystore-store-file: ${{ secrets.RNEF_UPLOAD_STORE_FILE }}
    keystore-store-password: ${{ secrets.RNEF_UPLOAD_STORE_PASSWORD }}
    keystore-key-alias: ${{ secrets.RNEF_UPLOAD_KEY_ALIAS }}
    keystore-key-password: ${{ secrets.RNEF_UPLOAD_KEY_PASSWORD }}
```

### Alternative Settings

You can use the `rnef-build-extra-params` input parameter to pass extra parameters to the `rnef build:android` command, in order to apply custom params for gradlew command.

```yaml
- name: RNEF Remote Build - Android
  uses: ./.github/actions/rnef-remote-build-android
  with:
    variant: release
    rnef-build-extra-params: '--aab' # build an Android App Bundle for the Play Store
```
