#!/bin/bash
set -e

# Run changeset version
pnpm changeset version

# Update template dependencies (templates/ and packages/*/template/)
./scripts/update-template-dependencies.sh

# Regenerate lockfile with updated dependencies
pnpm install --no-frozen-lockfile

# Export version for GitHub Actions commit message
if [ -n "$GITHUB_ENV" ]; then
  VERSION=$(node -p "require('./packages/cli/package.json').version")
  echo "VERSION=$VERSION" >> "$GITHUB_ENV"
fi
