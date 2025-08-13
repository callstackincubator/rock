#!/bin/bash
set -e

echo "Updating all @rock-js/* dependencies to match CLI version..."

# Get the version from packages/cli/package.json
CLI_VERSION=$(jq -r '.version' packages/cli/package.json)
echo "Using CLI version: $CLI_VERSION"

# Function to update package.json files
update_package_json() {
    local file=$1
    echo "Processing $file..."
    
    # Create a temporary file
    temp_file=$(mktemp)
    
    # Update all @rock-js/* dependencies to match CLI version
    jq --arg version "^$CLI_VERSION" '
        # Only update if the field exists
        if has("dependencies") then
            .dependencies = (
                .dependencies | 
                to_entries | 
                map(if .key | startswith("@rock-js/") then .value = $version else . end) |
                from_entries
            )
        else . end |

        if has("devDependencies") then
            .devDependencies = (
                .devDependencies | 
                to_entries | 
                map(if .key | startswith("@rock-js/") then .value = $version else . end) |
                from_entries
            )

        else . end |
        
        if has("optionalDependencies") then
            .optionalDependencies = (
                .optionalDependencies | 
                to_entries | 
                map(if .key | startswith("@rock-js/") then .value = $version else . end) |
                from_entries
            )
        
        else . end |
        
        if has("peerDependencies") then
            .peerDependencies = (
                .peerDependencies | 
                to_entries | 
                map(if .key | startswith("@rock-js/") then .value = $version else . end) |
                from_entries
            )
        else . end
    ' "$file" > "$temp_file"
    
    # Replace the original file with the updated one
    mv "$temp_file" "$file"
}

update_package_json_version() {
    local file=$1
    echo "Updating version in $file..."

    # Get the version from packages/cli/package.json
    CLI_VERSION=$(jq -r '.version' packages/cli/package.json)
    echo "Using CLI version: $CLI_VERSION"

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

echo "Done! All @rock-js/* dependencies have been updated to version ^$CLI_VERSION." 
