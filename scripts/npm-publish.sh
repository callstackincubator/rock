#!/bin/bash
set -e

echo "Building all packages..."
pnpm nx reset
pnpm build

if [ -z "$NPM_TOKEN" ]; then
  read -p "Enter NPM OTP: " OTP
fi

echo "NPM: Publishing all packages"
# If NPM_TOKEN is set (CI environment), use it
if [ -n "$NPM_TOKEN" ]; then
  pnpm nx run-many -t publish:npm
else
  pnpm nx run-many -t publish:npm -- --otp="$OTP"
fi

echo "NPM: Publishing template"
cd templates/rnef-template-default
# If NPM_TOKEN is set (CI environment), use it
if [ -n "$NPM_TOKEN" ]; then
  npm publish
else
  npm publish --otp="$OTP"
fi

echo "Done"
