# iOS GitHub Action

This GitHub Action allows you to build iOS apps using Rock's remote build system. It supports both simulator builds for development and signed device builds for testing and release. If you haven't yet, please check the [configuration guide](./configuration.md) where you can find information on optimal workflow setup, permissions, optimizations and GitHub Personal Access Tokens.

## Development Builds For Simulators

Builds an APP (`.app`) file in debug configuration suitable for development. Doesn't require signing.

Use in the GitHub Workflow file like this:

```yaml
- name: Rock Remote Build - iOS simulator
  id: rock-remote-build-ios
  uses: callstackincubator/ios@v3
  with:
    destination: simulator
    github-token: ${{ secrets.GITHUB_TOKEN }}
    configuration: Debug
```

## Tester Builds For Devices

Builds an IPA (`.ipa`) file in release variant suitable for testing. Requires signing.

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

Once created, store it as `ROCK_APPLE_PROVISIONING_PROFILE_BASE64` secret on your GitHub repository.

#### Certificate

A certificate can be either Development or Distribution. The Development certificate allows for installing on a device through Xcode and is intended for development purposes. The Distribution certificate allows for installing on a device through the App Store/TestFlight, etc.

A certificate has a public and private part. The public part can generally be downloaded from the Apple Developer portal, while the private part is stored on a developer’s machine and needs to be distributed separately (e.g., to other developers or CI).

:::info
You need to have access to both the public and private parts of the certificate on the CI to generate an IPA file.
:::

In order to install the certificate on GitHub Actions, you need to export the certificate (including the private key) as a base64 string, as described in the [GitHub docs](https://docs.github.com/en/actions/use-cases-and-examples/deploying/installing-an-apple-certificate-on-macos-runners-for-xcode-development). You can do it using the following command, which will copy the contents to your clipboard:

```bash
base64 -i BUILD_CERTIFICATE.p12 | pbcopy
```

Once created, store it as `ROCK_APPLE_CERTIFICATE_BASE64` secret on your GitHub repository.

:::note
A modern alternative to the Distribution certificate is the "Distributed Managed" certificate, which is a managed certificate where the private part is stored on Apple’s servers, and Apple actually handles the signing operation.
:::

#### GitHub Actions Secrets

In order to build signed iOS device builds, you need to set up the following secrets on your GitHub repository:

- `ROCK_APPLE_CERTIFICATE_BASE64` – Base64 version of the certificate
- `ROCK_APPLE_CERTIFICATE_PASSWORD` – Certificate password
- `ROCK_APPLE_PROVISIONING_PROFILE_BASE64` – Base64 version of the provisioning profile
- `ROCK_APPLE_KEYCHAIN_PASSWORD` – Password to keychain (created temporarily by the GitHub Action)

### Running on GitHub Actions

Use in the GitHub Workflow file like this:

```yaml
- name: Rock Remote Build - iOS device
  id: rock-remote-build-ios
  uses: callstackincubator/ios@v3
  with:
    destination: device
    github-token: ${{ secrets.GITHUB_TOKEN }}
    configuration: Release
    certificate-base64: ${{ secrets.APPLE_BUILD_CERTIFICATE_BASE64 }}
    certificate-password: ${{ secrets.APPLE_BUILD_CERTIFICATE_PASSWORD }}
    provisioning-profile-base64: ${{ secrets.APPLE_BUILD_PROVISIONING_PROFILE_BASE64 }}
    provisioning-profile-name: 'PROVISIONING_PROFILE_NAME'
    keychain-password: ${{ secrets.APPLE_KEYCHAIN_PASSWORD }}
```

Make sure that the `provisioning-profile-name` is the same as the one in your provisioning profile set in the Xcode project (see above).

### Other Action Inputs

#### `rock-build-extra-params`

Default: ""

Pass extra parameters to the `rock build:ios` command, in order to apply custom code signing settings to the `xcodebuild archive` and `xcodebuild -exportArchive` commands.

```yaml
- name: Rock Remote Build - iOS device
  id: rock-remote-build-ios
  uses: callstackincubator/ios@v3
  with:
    destination: device
    github-token: ${{ secrets.GITHUB_TOKEN }}
    rock-build-extra-params: 'CUSTOM FLAGS AND ENVIRONMENT VARIABLES'
```

#### `re-sign`

Default: `false`

Re-sign the IPA with latest JS bytecode bundle with `rock sign:ios`. Necessary for tester device builds.
When `true`, it will produce new artifact for every commit in a Pull Request, with a PR number appended to the original artifact name associated with native state of the app, e.g. `rock-ios-device-Release-94a82df39e12-1337`, where `1337` is the unique PR number.
To avoid polluting artifact storage it will also handle removal of old artifacts associated with older commits.

```yaml
- name: Rock Remote Build - iOS device
  id: rock-remote-build-ios
  uses: callstackincubator/ios@v3
  with:
    destination: device
    github-token: ${{ secrets.GITHUB_TOKEN }}
    re-sign: true
    # ...rest of code signing inputs
```

#### `working-directory`

Default: `.`

When in monorepo, you may need to set the working directory something else than root of the repository.

For example in the following setup:

```
packages/
  mobile/
    ios/
    android/
    rock.config.mjs
```

You'll need to set `working-directory: ./packages/mobile`:

```yaml
- name: Rock Remote Build - iOS device
  id: rock-remote-build-ios
  uses: callstackincubator/ios@v3
  with:
    destination: device
    github-token: ${{ secrets.GITHUB_TOKEN }}
    working-directory: ./packages/mobile
```

### Action Outputs

#### `artifact-url`

URL of the relevant iOS build artifact.

#### `artifact-id`

ID of the relevant iOS build artifact. Suitable for retrieving artifacts for reuse in other jobs.

```yaml
build-release:
  outputs:
    artifact-id: ${{ steps.rock-remote-build-ios.outputs.artifact-id }}
  # ...steps running action with `rock-remote-build-ios` id

run-e2e-tests:
  runs-on: ubuntu-latest
  needs: build-release

  steps:
    - name: Download and Unpack IPA artifact
      run: |
        curl -L -H "Authorization: token ${{ github.token }}" -o artifact.zip "https://api.github.com/repos/${{ github.repository }}/actions/artifacts/${{ needs.build-release.outputs.artifact-id }}/zip"
        unzip artifact.zip -d downloaded-artifacts
        ls -l downloaded-artifacts
        IPA_PATH=$(find downloaded-artifacts -name "*.ipa" -print -quit)
        echo "ARTIFACT_PATH_FOR_E2E=$IPA_PATH" >> $GITHUB_ENV
      shell: bash

    - name: Run E2E test
      run: # ...install $ARTIFACT_PATH_FOR_E2E on device and run tests
```
