import * as fs from 'node:fs';
import * as path from 'node:path';
import { cleanup, getTempDirectory, writeFiles } from '@rock-js/test-helpers';
import * as tools from '@rock-js/tools';
import { updateAndroidBuildGradle, updatePodfile } from '../initInExistingProject.js';

const directory = getTempDirectory('test_updateAndroidBuildGradle');

afterEach(() => {
  cleanup(directory);
});

describe('updateAndroidBuildGradle', () => {
  const workingCases = [
    {
      name: 'cliFile is commented out',
      content: `
        react {
          // cliFile = file("../../node_modules/react-native/cli.js")
        }
      `,
      expected: `
        react {
          cliFile = file("../../node_modules/rock/dist/src/bin.js")
        }
      `,
    },
    {
      name: 'cliFile is not commented out',
      content: `
        reactNativeDir = file("../../node_modules/react-native")

        react {
          cliFile = file("\${reactNativeDir}/cli.js")
        }
      `,
      expected: `
        reactNativeDir = file("../../node_modules/react-native")

        react {
          cliFile = file("../../node_modules/rock/dist/src/bin.js")
        }
      `,
    },
    {
      name: 'cliFile is using a variable',
      content: `
        reactNativeDir = file("../../node_modules/react-native")

        react {
          cliFile = file("\${reactNativeDir}/cli.js")
        }
      `,
      expected: `
        reactNativeDir = file("../../node_modules/react-native")

        react {
          cliFile = file("../../node_modules/rock/dist/src/bin.js")
        }
      `,
    },
  ];

  it.each(workingCases)(
    'should update the Android build.gradle file when $name',
    ({ content, expected }) => {
      const files = {
        'android/app/build.gradle': content,
      };
      writeFiles(directory, files);
      updateAndroidBuildGradle(directory, 'android');

      expect(
        fs.readFileSync(
          path.join(directory, 'android/app/build.gradle'),
          'utf8',
        ),
      ).toStrictEqual(expected);
    },
  );

  it('should not update the Android build.gradle file when cliFile is already set', () => {
    const content = `
      react {
        cliFile = file("../../node_modules/rock/dist/src/bin.js")
      }
    `;
    const files = {
      'android/app/build.gradle': content,
    };

    writeFiles(directory, files);
    updateAndroidBuildGradle(directory, 'android');

    expect(
      fs.readFileSync(path.join(directory, 'android/app/build.gradle'), 'utf8'),
    ).toStrictEqual(content);
  });

  it('should display a warning when unable to update the Android build.gradle file', () => {
    const warn = vi.spyOn(tools.logger, 'warn');

    const content = `
      react {}
    `;

    const files = {
      'android/app/build.gradle': content,
    };

    writeFiles(directory, files);
    updateAndroidBuildGradle(directory, 'android');

    expect(
      fs.readFileSync(path.join(directory, 'android/app/build.gradle'), 'utf8'),
    ).toStrictEqual(content);

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Unable to update'),
    );
  });
});

describe('updatePodfile', () => {
  it('replaces a bare `use_native_modules!` call (Community-CLI template)', () => {
    const content = `
target 'App' do
  config = use_native_modules!

  use_react_native!(:path => config[:reactNativePath])
end
`;
    const expected = `
target 'App' do
  config = use_native_modules!(['npx', 'rock', 'config', '-p', 'ios'])

  use_react_native!(:path => config[:reactNativePath])
end
`;
    writeFiles(directory, { 'ios/Podfile': content });
    updatePodfile(directory, 'ios');

    expect(
      fs.readFileSync(path.join(directory, 'ios/Podfile'), 'utf8'),
    ).toStrictEqual(expected);
  });

  it('replaces a `use_native_modules!(config_command)` call (Expo prebuild template, regression test for #702)', () => {
    const content = `
target 'App' do
  config_command = ['node', '--no-warnings', '--eval', "require('expo/bin/autolinking')"]
  config = use_native_modules!(config_command)

  use_react_native!(:path => config[:reactNativePath])
end
`;
    const expected = `
target 'App' do
  config_command = ['node', '--no-warnings', '--eval', "require('expo/bin/autolinking')"]
  config = use_native_modules!(['npx', 'rock', 'config', '-p', 'ios'])

  use_react_native!(:path => config[:reactNativePath])
end
`;
    writeFiles(directory, { 'ios/Podfile': content });
    updatePodfile(directory, 'ios');

    expect(
      fs.readFileSync(path.join(directory, 'ios/Podfile'), 'utf8'),
    ).toStrictEqual(expected);
  });

  it('is idempotent — running on an already-patched Podfile is a no-op', () => {
    const content = `
target 'App' do
  config = use_native_modules!(['npx', 'rock', 'config', '-p', 'ios'])
end
`;
    writeFiles(directory, { 'ios/Podfile': content });
    updatePodfile(directory, 'ios');

    expect(
      fs.readFileSync(path.join(directory, 'ios/Podfile'), 'utf8'),
    ).toStrictEqual(content);
  });

  it('does nothing when there is no Podfile', () => {
    // No Podfile written; updatePodfile should return without throwing.
    expect(() => updatePodfile(directory, 'ios')).not.toThrow();
  });
});

