# Configuration

React Native Enterprise Framework ships with a ready-to-use GitHub Actions:

- [`callstackincubator/ios`](https://github.com/callstackincubator/ios)
- [`callstackincubator/android`](https://github.com/callstackincubator/android)

which you can include in your GHA workflows to build iOS and Android apps and store native artifacts to reuse across CI jobs and local dev environment through RNEF CLI.

## Workflow permissions

Make sure to include the following workflow permissions for your project:

Settings -> Actions -> General -> Workflow Permissions -> **Read and write permissions**

## Generate GitHub Personal Access Token for downloading cached builds

You'll be asked about this token when cached build is available while running the `npx rnef run:` command.

### Fine-grained tokens for organizations

Generate a [fine-grained Personal Access Token](https://github.com/settings/personal-access-tokens/new) and set **Resource owner** to your organization. Ensure the following repository permissions:

- Actions: Read
- Contents: Read
- Metadata: Read-only

### Personal classic access token for individual developers

Generate [GitHub Personal Access Token](https://github.com/settings/tokens/new?scopes=repo) for downloading cached builds with `repo` permissions.
