import { describe, expect, it } from 'vitest';
import {
  patchAndroidBuildGradle,
  patchAndroidSettingsGradle,
  patchPodfile,
  patchXcodeProject,
} from '../withRockAutolinking.js';

describe('patchPodfile', () => {
  it('rewrites the Community-CLI bare call', () => {
    const input = `target 'App' do
  config = use_native_modules!

  use_react_native!(:path => config[:reactNativePath])
end
`;
    const expected = `target 'App' do
  config = use_native_modules!(['npx', 'rock', 'config', '-p', 'ios'])

  use_react_native!(:path => config[:reactNativePath])
end
`;
    expect(patchPodfile(input)).toBe(expected);
  });

  it('rewrites the Expo prebuild call with an existing argument', () => {
    const input = `target 'App' do
  config_command = ['node', '-e', "require('expo/bin/autolinking')"]
  config = use_native_modules!(config_command)
end
`;
    const expected = `target 'App' do
  config_command = ['node', '-e', "require('expo/bin/autolinking')"]
  config = use_native_modules!(['npx', 'rock', 'config', '-p', 'ios'])
end
`;
    expect(patchPodfile(input)).toBe(expected);
  });

  it('is idempotent on an already-patched Podfile', () => {
    const input = `target 'App' do
  config = use_native_modules!(['npx', 'rock', 'config', '-p', 'ios'])
end
`;
    expect(patchPodfile(input)).toBe(input);
  });
});

describe('patchAndroidBuildGradle', () => {
  it('replaces a commented-out cliFile', () => {
    const input = `
      react {
        // cliFile = file("../../node_modules/react-native/cli.js")
      }
    `;
    const expected = `
      react {
        cliFile = file("../../node_modules/rock/dist/src/bin.js")
      }
    `;
    expect(patchAndroidBuildGradle(input)).toBe(expected);
  });

  it('replaces a live cliFile pointing at react-native', () => {
    const input = `
      react {
        cliFile = file("\${reactNativeDir}/cli.js")
      }
    `;
    const expected = `
      react {
        cliFile = file("../../node_modules/rock/dist/src/bin.js")
      }
    `;
    expect(patchAndroidBuildGradle(input)).toBe(expected);
  });

  it('is idempotent on an already-patched file', () => {
    const input = `
      react {
        cliFile = file("../../node_modules/rock/dist/src/bin.js")
      }
    `;
    expect(patchAndroidBuildGradle(input)).toBe(input);
  });
});

describe('patchAndroidSettingsGradle', () => {
  it('replaces the full configure block', () => {
    const input = `
rootProject.name = 'App'
include ':app'
extensions.configure(com.facebook.react.ReactSettingsExtension){ ex -> ex.autolinkLibrariesFromCommand(['node', '-e', "require('@react-native-community/cli').run()"]) }
`;
    const out = patchAndroidSettingsGradle(input);
    expect(out).toContain("autolinkLibrariesFromCommand(['npx', 'rock', 'config', '-p', 'android'])");
    expect(out).not.toContain('@react-native-community/cli');
  });

  it('falls back to replacing just the inner call', () => {
    const input = `someUnrelatedScope { autolinkLibrariesFromCommand(['foo']) }`;
    const out = patchAndroidSettingsGradle(input);
    expect(out).toContain("autolinkLibrariesFromCommand(['npx', 'rock', 'config', '-p', 'android'])");
  });

  it('is idempotent', () => {
    const input = `autolinkLibrariesFromCommand(['npx', 'rock', 'config', '-p', 'android'])`;
    expect(patchAndroidSettingsGradle(input)).toBe(input);
  });
});

describe('patchXcodeProject', () => {
  it('rewrites the default Community-CLI build phase shellScript', () => {
    const original =
      'shellScript = "set -e\\n\\nWITH_ENVIRONMENT=\\"$REACT_NATIVE_PATH/scripts/xcode/with-environment.sh\\"\\nREACT_NATIVE_XCODE=\\"$REACT_NATIVE_PATH/scripts/react-native-xcode.sh\\"\\n\\n/bin/sh -c \\"$WITH_ENVIRONMENT $REACT_NATIVE_XCODE\\"\\n";';
    const out = patchXcodeProject(original);
    expect(out).toContain("require.resolve('rock/package.json')");
    expect(out).not.toContain('REACT_NATIVE_XCODE=');
  });

  it('rewrites the RN 0.83 build phase shellScript', () => {
    const original =
      'shellScript = "set -e\\n\\nWITH_ENVIRONMENT=\\"$REACT_NATIVE_PATH/scripts/xcode/with-environment.sh\\"\\nREACT_NATIVE_XCODE=\\"$REACT_NATIVE_PATH/scripts/react-native-xcode.sh\\"\\n\\n/bin/sh -c \\"\\\\\\"$WITH_ENVIRONMENT\\\\\\" \\\\\\"$REACT_NATIVE_XCODE\\\\\\"\\"\\n";';
    const out = patchXcodeProject(original);
    expect(out).toContain("require.resolve('rock/package.json')");
  });

  it('is idempotent on an already-patched pbxproj', () => {
    const patched =
      'shellScript = "set -e\\nif [[ -f \\"$PODS_ROOT/../.xcode.env\\" ]]; then\\nsource \\"$PODS_ROOT/../.xcode.env\\"\\nfi\\nif [[ -f \\"$PODS_ROOT/../.xcode.env.local\\" ]]; then\\nsource \\"$PODS_ROOT/../.xcode.env.local\\"\\nfi\\nexport CONFIG_CMD=\\"dummy-workaround-value\\"\\nexport CLI_PATH=\\"$(\\"$NODE_BINARY\\" --print \\"require(\'path\').dirname(require.resolve(\'rock/package.json\')) + \'/dist/src/bin.js\'\\")\\"\\nWITH_ENVIRONMENT=\\"$REACT_NATIVE_PATH/scripts/xcode/with-environment.sh\\"\\n";';
    expect(patchXcodeProject(patched)).toBe(patched);
  });

  it('leaves unrelated pbxproj content untouched', () => {
    const input = `// some random pbxproj content without the target phase`;
    expect(patchXcodeProject(input)).toBe(input);
  });
});
