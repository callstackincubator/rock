#!/bin/bash
set -e

echo "Building all packages..."

pnpm build

if [ -z "$NPM_TOKEN" ] && [ -z "$CI" ] && [ -z "$GITHUB_ACTIONS" ]; then
  read -p "Enter NPM OTP: " OTP
fi

echo "NPM: Publishing all packages"
# In CI, trusted publishing should be non-interactive and not require OTP input.
if [ -n "$NPM_TOKEN" ] || [ -n "$CI" ] || [ -n "$GITHUB_ACTIONS" ]; then
  pnpm -r run publish:npm
else
  pnpm -r --no-bail run publish:npm --otp="$OTP"
fi

echo "NPM: Publishing template"
cd templates/rock-template-default
# In CI, trusted publishing should be non-interactive and not require OTP input.
if [ -n "$NPM_TOKEN" ] || [ -n "$CI" ] || [ -n "$GITHUB_ACTIONS" ]; then
  npm publish
else
  npm publish --otp="$OTP"
fi

echo "Done"
