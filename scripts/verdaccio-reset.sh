#!/bin/bash

npm config set registry https://registry.npmjs.org/
rm -f ~/.npmrc
rm -rf /tmp/verdaccio-storage
