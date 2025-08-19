#!/bin/bash
set -e

echo "Updating all @rock-js/* and rock dependencies to match CLI version..."

# Get the version from packages/cli/package.json
CLI_VERSION=$(jq -r '.version' packages/cli/package.json)
echo "Using CLI version: $CLI_VERSION"

# Function to update package.json files
update_package_json() {
    local file=$1
    echo "Processing $file..."
    
    # Create a temporary file
    temp_file=$(mktemp)
    
    # Update all @rock-js/* and rock dependencies to match CLI version
    jq --arg version "^$CLI_VERSION" '
        # Helper function to update dependencies
        def update_deps(deps):
            if deps then
                deps |
                to_entries |
                map(
                    if (.key | startswith("@rock-js/")) or (.key == "rock") then
                        .value = $version
                    else
                        .
                    end
                ) |
                from_entries
            else
                deps
            end;
        
        # Update only existing dependency types
        if has("dependencies") then .dependencies = update_deps(.dependencies) else . end |
        if has("devDependencies") then .devDependencies = update_deps(.devDependencies) else . end |
        if has("optionalDependencies") then .optionalDependencies = update_deps(.optionalDependencies) else . end |
        if has("peerDependencies") then .peerDependencies = update_deps(.peerDependencies) else . end
    ' "$file" > "$temp_file"
    
    # Replace the original file with the updated one
    mv "$temp_file" "$file"
}

# Function to update package.json version
update_package_json_version() {
    local file=$1
    echo "Updating version in $file..."

    # Create a temporary file
    temp_file=$(mktemp)

    # Update the version in the package.json file
    jq --arg version "$CLI_VERSION" '.version = $version' "$file" > "$temp_file"

    # Replace the original file with the updated one
    mv "$temp_file" "$file"
}

# Find all package.json files in templates directory and update them
find ./templates -name "package.json" -not -path "*/node_modules/*" | while read -r file; do
    update_package_json "$file"
    update_package_json_version "$file"
done

# Find all package.json files in packages/*/template directories and update them
find ./packages -path "*/template/*" -name "package.json" -not -path "*/node_modules/*" | while read -r file; do
    update_package_json "$file"
done

echo "Done! All @rock-js/* and rock dependencies have been updated to version ^$CLI_VERSION." 
