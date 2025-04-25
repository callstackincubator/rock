set -e

if [[ -f "$PODS_ROOT/../.xcode.env" ]]; then
    source "$PODS_ROOT/../.xcode.env"
fi

if [[ -f "$PODS_ROOT/../.xcode.env.local" ]]; then
    source "$PODS_ROOT/../.xcode.env.local"
fi

export CONFIG_CMD="dummy-workaround-value"
export CLI_PATH="$("$NODE_BINARY" --print "require('path').dirname(require.resolve('@rnef/cli/package.json')) + '/dist/src/bin.js'")"

WITH_ENVIRONMENT="$REACT_NATIVE_PATH/scripts/xcode/with-environment.sh"
REACT_NATIVE_XCODE="$REACT_NATIVE_PATH/scripts/react-native-xcode.sh"
/bin/sh -c "$WITH_ENVIRONMENT $REACT_NATIVE_XCODE"
