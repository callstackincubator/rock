# AGENTS.md

Rock is a modular React Native CLI. `packages/config` loads project configuration and
creates the `PluginApi`; platform, bundler, and utility plugins register commands through it.

## Architecture

- Platform logic is encapsulated in `packages/platform-*`; projects add platforms dynamically
  through configuration. Core code must use `PluginApi`, not hard-code platform implementations.
- Shared Apple implementation belongs in `packages/platform-apple-helpers`.
- `packages/tools` owns cross-package contracts, fingerprinting, caching, logging, and process helpers.
- Keep shared command behavior provider- and platform-agnostic; specialize at package boundaries.
- `plugin-metro`'s `start` and `bundle` commands are ports of React Native's community CLI plugin;
  diff their upstream sources on every React Native upgrade, especially Metro handling.
- Runtime packages remain compatible with older React Native and Metro APIs; the default template
  instead tracks the latest available React Native. Do not infer runtime minimums from template deps.
- `templates/rock-template-default` follows the Community CLI template but is not a verbatim mirror;
  platform and bundler packages contribute additional template fragments.
- `create-rock` migrates existing Community CLI projects; preserve drop-in behavior unless a
  difference is intentional and documented.

## Release rules

- For the current 0.x line, use a patch Changeset unless adding support for a new React Native version.
- Changesets version `@rock-js/*`, `rock`, and `create-rock` together as a fixed group.

## Validation

- Test and typecheck the affected package first.
- Run `pnpm build` for cross-package API or contract changes.
