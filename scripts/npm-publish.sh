#!/bin/bash
set -e

echo "Building all packages..."
pnpm nx reset
pnpm build

read -p "Enter NPM OTP: " OTP

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
  npm publish --access restricted
else
  npm publish --access restricted --otp="$OTP"
fi

echo "Done"
