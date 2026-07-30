# AGENTS.md

Rock is a modular React Native CLI. `packages/config` loads project configuration and
creates the `PluginApi`; platform, bundler, and utility plugins register commands through it.

## Architecture

- Platform logic is encapsulated in `packages/platform-*`; projects add platforms dynamically
  through configuration. Core code must use `PluginApi`, not hard-code platform implementations.
- Shared Apple implementation belongs in `packages/platform-apple-helpers`.
- `packages/tools` owns cross-package contracts, fingerprinting, caching, logging, and process helpers.
- Remote-cache implementations belong in `packages/provider-*` behind `RemoteBuildCache`.
- Keep shared command behavior provider- and platform-agnostic; specialize at package boundaries.
- User-facing configuration changes may require matching `packages/create-app` template updates.
- User-facing command or configuration changes require corresponding `website/src/docs` updates.

## Release rules

- For the current 0.x line, use a patch Changeset unless adding support for a new React Native version.
- Changesets version `@rock-js/*`, `rock`, and `create-rock` together as a fixed group.

## Validation

- Test and typecheck the affected package first.
- Run `pnpm build` for cross-package API or contract changes.
- Use `pnpm validate` before finalizing broad changes.
- Some tests fetch external resources; isolate network failures before treating them as regressions.
