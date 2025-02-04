#!/bin/bash
set -e

echo "Building all packages..."
pnpm nx reset
pnpm build

read -p "Enter NPM OTP: " OTP

echo "NPM: Publishing all packages"
pnpm nx run-many -t publish:npm -- --otp="$OTP"

echo "NPM: Publishing template"
cd templates/rnef-template-default
npm publish --access restricted --otp="$OTP"

echo "Done"
