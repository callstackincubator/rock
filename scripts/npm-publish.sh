#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "Building all packages..."

pnpm build

if [ -z "${CI:-}" ] && [ -z "${GITHUB_ACTIONS:-}" ]; then
  read -p "Enter NPM OTP: " OTP
fi

publish_package() {
  local package_dir="$1"
  local package_json="$package_dir/package.json"
  shift

  local package_name
  local package_version
  local package_ref

  package_name=$(node -p "require(process.argv[1]).name" "$package_json")
  package_version=$(node -p "require(process.argv[1]).version" "$package_json")
  package_ref="${package_name}@${package_version}"

  if npm view "$package_ref" version --registry https://registry.npmjs.org/ --silent >/dev/null 2>&1; then
    echo "Skipping already published package ${package_ref}"
    return 0
  fi

  echo "Publishing ${package_ref}"
  (
    cd "$package_dir"
    npm publish "$@"
  )
}

echo "NPM: Publishing all packages"
for package_json in "$ROOT_DIR"/packages/*/package.json; do
  if ! grep -q '"publish:npm"' "$package_json"; then
    continue
  fi

  publish_args=()
  if [ -z "${CI:-}" ] && [ -z "${GITHUB_ACTIONS:-}" ]; then
    publish_args+=(--otp="$OTP")
  fi

  publish_package "${package_json%/package.json}" --access public "${publish_args[@]}"
done

echo "NPM: Publishing template"
template_publish_args=()
if [ -z "${CI:-}" ] && [ -z "${GITHUB_ACTIONS:-}" ]; then
  template_publish_args+=(--otp="$OTP")
fi
publish_package "$ROOT_DIR/templates/rock-template-default" --access public "${template_publish_args[@]}"

echo "Done"
