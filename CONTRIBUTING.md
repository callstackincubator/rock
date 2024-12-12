# Contributing to RNEF

## Development Process

All work on RNEF happens directly on GitHub. Contributors send pull requests which go through review process.

> **Working on your first pull request?** You can learn how from this _free_ series: [How to Contribute to an Open Source Project on GitHub](https://egghead.io/series/how-to-contribute-to-an-open-source-project-on-github).

1. Fork the repo and create your branch from `main` (a guide on [how to fork a repository](https://help.github.com/articles/fork-a-repo/)).
1. Run `pnpm i` to install all required dependencies.
1. Run `pnpm watch` to automatically build the changed files.
1. Now you are ready to do the changes.

## Testing your changes

> Please make sure the version of React Native matches the one present in devDependencies of RNEF. Otherwise, you may get unexpected errors.

### Setup

Because of a modular design of the RNEF, we recommend developing using symbolic links to its packages. This way you can use it seamlessly in the tested project, as you'd use the locally installed RNEF CLI. Here's what you need to run in the terminal:

```sh
cd /path/to/cloned/rnef/
pnpm link-packages
```

And then in your test project:

```sh
cd /my/test/project/
pnpm link --global "@callstack/rnef-cli" "@callstack/rnef-config" "@callstack/rnef-tools" "@callstack/rnef-plugin-platform-android" "@callstack/rnef-plugin-platform-ios" "@callstack/create-rnef-app" "@callstack/rnef-plugin-metro" "@callstack/rnef-plugin-repack"
```

Update entries in package.json to look like this:

```json
{
  "@callstack/rnef-cli": "link:../../rnef/packages/cli",
  "@callstack/rnef-plugin-platform-android": "link:../../rnef/packages/plugin-platform-android"
}
```

#### Hoist pnpm dependencies

Set node-linker to hoisted in your test project's `.npmrc` file for pnpm to place the node_modules in a way that React Native platform tooling expects:

```
node-linker=hoisted
```

#### Update Metro configuration

When using Metro plugin, you'll need to update the `watchFolders` to hint Metro to look for symlinks in RNEF project. You can do this by adding the following to your `metro.config.js`:

```js
{
  watchFolders: [path.resolve(__dirname, '../path/to/rnef')],
}
```

This configuration is not necessary when using Re.Pack plugin.

### Run in your test project

```sh
pnpm rnef start
pnpm rnef run:android
```

### Testing Create RNEF App project

In order to test changes to `create-app` package, you need to run the following commands:

```sh
# Ensure fresh build
nx reset
pnpm build

# Start local verdaccio registry (in one terminal), keep it open
pnpm verdaccio:init

# Publish packages to verdaccio (in another terminal)
pnpm verdaccio:publish

# Remove pnpm dlx cache, so that new version of package is used
rm -rf ~/Library/Caches/pnpm/dlx/

# Run tests
pnpm e2e

# Or Create RNEF app
NPM_CONFIG_REGISTRY=http://localhost:4873 pnpm create @callstack/rnef-app --registry http://localhost:4873
# Then use pnpm install with registry
NPM_CONFIG_REGISTRY=http://localhost:4873 pnpm install

# Clean up
pnpm verdaccio-reset
```

## Typechecking, linting and testing

Currently we use TypeScript for typechecking, `eslint` with `prettier` for linting and formatting the code and `jest` for testing.

- `pnpm lint`: run `eslint` and `prettier`
- `pnpm test`: run unit tests

## Commit message convention

We prefix our commit messages with one of the following to signify the kind of change:

- **build**: Changes that affect the build system or external dependencies
- **ci**, **chore**: Changes to our CI configuration files and scripts
- **docs**: Documentation only changes
- **feat**: A new feature
- **fix**: A bug fix
- **perf**: A code change that improves performance
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **style**: Changes that do not affect the meaning of the code
- **test**: Adding missing tests or correcting existing tests

## Sending a pull request

When you're sending a pull request:

- Prefer small pull requests focused on one change.
- Verify that TypeScript, `eslint` and all tests are passing.
- Preview the documentation to make sure it looks good.
- Follow the pull request template when opening a pull request.

## Publishing workflow

This part is for maintainers only, documenting steps to manually publish the packages with Nx.

### Stable version

1. Pull latest changes for the stable branch.
1. Run `pnpm run publish`, it will tag the packages as `latest`.
1. Chose an appropriate version from the available options.
1. Create release notes in the project's Release tab.

### Prerelease

1. Pull latest changes for the `main` branch.
1. Run `pnpm run publish:next`, it will tag the packages as `next`.
1. Use `Custom prerelease` option and go with `-alpha.N` convention.
1. Create release notes in the project's Release tab.

### Legacy version

1. Pull latest changes for the _N.x_ branch (where N stands for major legacy version).
1. Run `pnpm run publish --dist-tag N.x` to tag the packages as `N.x`.
1. Chose an appropriate version from the available options.
1. Create release notes in the project's Release tab.

## Reporting issues

You can report issues on our [bug tracker](https://github.com/callstack/rnef/issues). Please follow the issue template when opening an issue.

## Stale Bot

This repository is using bot to automatically mark issues and PRs as stale and close them. The "stale" label is added after 90 days of inactivity, and it's getting closed 7 days later. If you find the issue important or you want to keep it open for any particular reason, please show any activity in the issue or contact maintainers to add the "no-stale-bot" label, which prevents bot from closing the issues.

## License

By contributing to RNEF, you agree that your contributions will be licensed under its **MIT** license.
