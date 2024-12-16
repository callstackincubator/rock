#!/bin/bash

npm config set registry https://registry.npmjs.org/
echo "link-workspace-packages=true\nauto-install-peers=true" > .npmrc
rm -rf /tmp/verdaccio-storage
