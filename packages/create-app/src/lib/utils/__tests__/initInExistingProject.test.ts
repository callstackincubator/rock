import * as fs from 'node:fs';
import * as path from 'node:path';
import { cleanup, getTempDirectory, writeFiles } from '@rock-js/test-helpers';
import * as tools from '@rock-js/tools';
import { updateAndroidBuildGradle } from '../initInExistingProject.js';

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
