# Configuration

React Native Enterprise Framework ships with a ready-to-use GitHub Actions:

- [`callstackincubator/ios`](https://github.com/callstackincubator/ios)
- [`callstackincubator/android`](https://github.com/callstackincubator/android)

which you can include in your GHA workflows to build iOS and Android apps and store native artifacts to reuse across CI jobs and local dev environment through RNEF CLI.

## Workflow permissions

Make sure to include the following workflow permissions for your project:

Settings -> Actions -> General -> Workflow Permissions -> **Read and write permissions**

## GitHub Workflow Setup

This is the recommended base setup for a GitHub Workflow file running our GitHub Actions:

```yaml
on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - '**'

concurrency:
  group: remote-build-ios-${{ github.ref }}
```

This configuration:

- Runs the workflow on pushes to the `main` branch
- Runs the workflow on pull requests to any branch

## Optimizing CI/CD Performance with paths-ignore

When using GitHub Actions workflows with RNEF, you can optimize your CI/CD pipelines by using `paths-ignore` to skip unnecessary workflow runs. This can significantly reduce CI time and costs, especially in large repositories where not all changes require rebuilding the mobile applications.

### How to implement paths-ignore

Add a `paths-ignore` section to your workflow's trigger configuration to specify which file patterns should not trigger the workflow:

```yaml
name: Mobile Build

on:
  push:
    branches:
      - main
    paths-ignore:
      - '*.md' # Skip documentation changes
      - 'docs/**' # Skip documentation directory
      - '.github/ISSUE_TEMPLATE/**' # Skip issue templates
      - 'web/**' # Skip web-specific code
      - 'server/**' # Skip backend code
      - 'design/**' # Skip design files
  # You can set similar config for pull_request hook
```

## Generate GitHub Personal Access Token for downloading cached builds

You'll be asked about this token when cached build is available while running the `npx rnef run:` command.

### Fine-grained tokens for organizations

Generate a [fine-grained Personal Access Token](https://github.com/settings/personal-access-tokens/new) and set **Resource owner** to your organization. Ensure the following repository permissions:

- Actions: Read
- Contents: Read
- Metadata: Read-only

### Personal classic access token for individual developers

Generate [GitHub Personal Access Token](https://github.com/settings/tokens/new?scopes=repo) for downloading cached builds with `repo` permissions.
