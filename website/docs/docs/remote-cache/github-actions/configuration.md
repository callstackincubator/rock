# Configuration

React Native Enterprise Framework ships with a ready-to-use GitHub Action whch you can include in your GHA workflows to build your iOS and Android apps and store native artifacts to reuse across CI jobs and local dev environment through RNEF CLI.

## Secrets

To use the RNEF GitHub Actions, you need to set up the secrets on your GitHub repository:
`NPM_TOKEN` and
platforms specific secrets described below in the iOS and Android sections.

## Change workflow permissions

Settings -> Actions -> General -> Workflow Permissions -> Read and write permissions

## Generate GitHub Personal Access Token for downloading cached builds

Generate GitHub Personal Access Token for downloading cached builds at: https://github.com/settings/tokens. Include "repo", "workflow", and "read:org" permissions.
You'll be asked about this token when cached build is available while running the `npx rnef run:` command.
