#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "Building all packages..."

pnpm build

if [ -z "$NPM_TOKEN" ] && [ -z "$CI" ] && [ -z "$GITHUB_ACTIONS" ]; then
  read -p "Enter NPM OTP: " OTP
fi

publish_package() {
  local package_dir="$1"
  shift

  node "$ROOT_DIR/scripts/npm-publish-package.mjs" "$package_dir" "$@"
}

echo "NPM: Publishing all packages"
for package_json in "$ROOT_DIR"/packages/*/package.json; do
  publish_args=()
  if [ -z "${NPM_TOKEN:-}" ] && [ -z "${CI:-}" ] && [ -z "${GITHUB_ACTIONS:-}" ]; then
    publish_args+=(--otp="$OTP")
  fi

  publish_package "${package_json%/package.json}" --access public "${publish_args[@]}"
done

echo "NPM: Publishing template"
template_publish_args=()
if [ -z "${NPM_TOKEN:-}" ] && [ -z "${CI:-}" ] && [ -z "${GITHUB_ACTIONS:-}" ]; then
  template_publish_args+=(--otp="$OTP")
fi
publish_package "$ROOT_DIR/templates/rock-template-default" "${template_publish_args[@]}"

echo "Done"
