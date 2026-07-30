# AGENTS.md

Rock is a pnpm monorepo for a modular React Native CLI. Configuration creates a shared
`PluginApi`; platform, bundler, and utility plugins register commands against it.

## Repository map

- `packages/cli` and `packages/config`: CLI bootstrap, config loading, and plugin contracts.
- `packages/tools`: shared types, fingerprinting, cache contracts, logging, and process helpers.
- `packages/platform-*`: platform commands; Apple platforms share `platform-apple-helpers`.
- `packages/plugin-*` and `packages/provider-*`: optional integrations and remote-cache providers.
- `packages/create-app`: project scaffolding and generated configuration.
- `website/src/docs`: user-facing documentation.

## Working rules

- Use pnpm only; do not add npm or Yarn lockfiles.
- This is ESM TypeScript: preserve `.js` suffixes in relative imports.
- Follow package boundaries and export public APIs through each package's `src/index.ts`.
- Keep shared behavior provider/platform-agnostic; specialize only at package boundaries.
- Reuse contracts and helpers from `@rock-js/tools` instead of duplicating them.
- Colocate Vitest tests under `src/**/__tests__` and follow existing package patterns.
- Update CLI help and website docs when changing user-facing commands or configuration.
- For 0.x releases, use patch Changesets unless adding support for a new React Native version.
- Keep PRs focused, preserve unrelated worktree changes, and use Conventional Commit prefixes.

## Validation

Start with the affected package's Vitest config and `tsc -p <package>/tsconfig.lib.json --noEmit`.
For cross-package changes, run focused lint/format checks, then `pnpm validate` and `pnpm build`.
