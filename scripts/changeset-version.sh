#!/bin/bash
set -e

# Run changeset version
pnpm changeset version

# Update template dependencies (templates/ and packages/*/template/)
./scripts/update-template-dependencies.sh

# Regenerate lockfile with updated dependencies
pnpm install --no-frozen-lockfile
