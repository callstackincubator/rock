# Android GitHub Action

This GitHub Action allows you to build Android apps using RNEF's remote build system. It supports both simulator builds for development and signed device builds for testing and release. If you haven't yet, please check the [configuration guide](./configuration.md) where you can find information on optimal workflow setup, permissions, optimizations and GitHub Personal Access Tokens.

## Development Builds For All Devices

Builds an APK (`.apk`) file in debug variants suitable for development. Doesn't require signing.

### Running on GitHub Actions

Use in the GitHub Workflow file like this:

```yaml
- name: RNEF Remote Build - Android
  id: rnef-remote-build-android
  uses: callstackincubator/android@v1
  with:
    variant: debug
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Tester Builds For All Devices

Builds an APK file in release variants suitable for testing. Requires signing.

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
  id: rnef-remote-build-android
  uses: callstackincubator/android@v1
  with:
    variant: release
    github-token: ${{ secrets.GITHUB_TOKEN }}
    # if you need to sign with non-debug keystore
    sign: true
    keystore-base64: ${{ secrets.KEYSTORE_BASE64 }}
    keystore-store-file: ${{ secrets.RNEF_UPLOAD_STORE_FILE }}
    keystore-store-password: ${{ secrets.RNEF_UPLOAD_STORE_PASSWORD }}
    keystore-key-alias: ${{ secrets.RNEF_UPLOAD_KEY_ALIAS }}
    keystore-key-password: ${{ secrets.RNEF_UPLOAD_KEY_PASSWORD }}
```

### Other Action Inputs

#### `rnef-build-extra-params`

Default: ""

Pass extra parameters to the `rnef build:android` command, in order to apply custom params for gradlew command.

```yaml
- name: RNEF Remote Build - Android
  id: rnef-remote-build-android
  uses: callstackincubator/android@v1
  with:
    variant: release
    github-token: ${{ secrets.GITHUB_TOKEN }}
    rnef-build-extra-params: '--aab' # build an Android App Bundle for the Play Store
```

#### `re-sign`

Default: `false`

Re-sign the APK with latest JS bytecode bundle with `rnef sign:android`. Necessary for tester device builds.
When `true`, it will produce new artifact for every commit in a Pull Request, with a PR number appended to the original artifact name associated with native state of the app, e.g. `rnef-android-release-9482df3912-1337`, where `1337` is the unique PR number.
To avoid polluting artifact storage it will also handle removal of old artifacts associated with older commits.

```yaml
- name: RNEF Remote Build - Android
  id: rnef-remote-build-android
  uses: callstackincubator/android@v1
  with:
    variant: release
    github-token: ${{ secrets.GITHUB_TOKEN }}
    re-sign: true
```

#### `validate-gradle-wrapper`

Default: `true`

For security reasons we add Gradle Wrapper validation step to Android build action. Pass `false` to disable validation.

```yaml
- name: RNEF Remote Build - Android
  id: rnef-remote-build-android
  uses: callstackincubator/android@v1
  with:
    variant: debug
    github-token: ${{ secrets.GITHUB_TOKEN }}
    validate-gradle-wrapper: false
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
    rnef.config.mjs
```

You'll need to set `working-directory: ./packages/mobile`:

```yaml
- name: RNEF Remote Build - Android
  id: rnef-remote-build-android
  uses: callstackincubator/android@v1
  with:
    variant: debug
    github-token: ${{ secrets.GITHUB_TOKEN }}
    working-directory: ./packages/mobile
```

### Action Outputs

#### `artifact-url`

URL of the relevant Android build artifact.

#### `artifact-id`

ID of the relevant Android build artifact. Suitable for retrieving artifacts for reuse in other jobs.

```yaml
build-release:
  outputs:
    artifact-id: ${{ steps.rnef-remote-build-android.outputs.artifact-id }}
  # ...steps running action with `rnef-remote-build-android` id

run-e2e-tests:
  runs-on: ubuntu-latest
  needs: build-release

  steps:
    - name: Download and Unpack APK artifact
      run: |
        curl -L -H "Authorization: token ${{ github.token }}" -o artifact.zip "https://api.github.com/repos/${{ github.repository }}/actions/artifacts/${{ needs.build-release.outputs.artifact-id }}/zip"
        unzip artifact.zip -d downloaded-artifacts
        ls -l downloaded-artifacts
        APK_PATH=$(find downloaded-artifacts -name "*.apk" -print -quit)
        echo "ARTIFACT_PATH_FOR_E2E=$APK_PATH" >> $GITHUB_ENV
      shell: bash

    - name: Run E2E test
      run: # ...install $ARTIFACT_PATH_FOR_E2E on device and run tests
```
