#!/bin/bash
set -e

echo "Building all packages..."

pnpm build

if [ -z "$NPM_TOKEN" ]; then
  read -p "Enter NPM OTP: " OTP
fi

echo "NPM: Publishing all packages"
# If NPM_TOKEN is set (CI environment), use it
if [ -n "$NPM_TOKEN" ]; then
  pnpm -r run publish:npm
else
  pnpm -r --no-bail run publish:npm --otp="$OTP"
fi

echo "NPM: Publishing template"
cd templates/rock-template-default
# If NPM_TOKEN is set (CI environment), use it
if [ -n "$NPM_TOKEN" ]; then
  npm publish
else
  npm publish --otp="$OTP"
fi

echo "Done"
