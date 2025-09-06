import fs from 'node:fs/promises';
import path from 'node:path';
import type { PluginApi, PluginOutput } from '@rock-js/config';
import { applyConfigPlugins } from './apply.js';
import type { ProjectInfo } from './types.js';

type ConfigPluginsArgs = {
  platforms: string[];
};

export const pluginExpoConfigPlugins =
  () =>
  (api: PluginApi): PluginOutput => {
    api.registerCommand({
      name: 'apply-config-plugins',
      description: 'Applies config plugins to the project.',
      action: async (args: ConfigPluginsArgs) => {
        const packageJsonPath = path.join(api.getProjectRoot(), 'package.json');
        const iosDirPath = path.join(api.getProjectRoot(), 'ios');
        const androidDirPath = path.join(api.getProjectRoot(), 'android');

        const [
          packageJsonContent,
          iosDirContent,
          androidAppBuildGradleContent,
        ] = await Promise.all([
          fs.readFile(packageJsonPath, 'utf-8'),
          fs.readdir(iosDirPath),
          fs.readFile(
            path.join(androidDirPath, 'app', 'build.gradle'),
            'utf-8',
          ),
        ]);

        if (!packageJsonContent.includes('"@expo/config-plugins"')) {
          return;
        }

        const iosProjectName =
          iosDirContent
            .find((dir) => dir.includes('.xcodeproj'))
            ?.split('.')[0] ?? '';

        const projectPbxprojContent = await fs.readFile(
          path.join(
            iosDirPath,
            `${iosProjectName}.xcodeproj`,
            'project.pbxproj',
          ),
          'utf-8',
        );

        const iosBundleIdentifier =
          projectPbxprojContent.match(
            /PRODUCT_BUNDLE_IDENTIFIER = "(.*)"/,
          )?.[1] ?? '';

        const androidPackageName =
          androidAppBuildGradleContent.match(/applicationId "(.*)"/)?.[1] ?? '';

        const platforms = args.platforms || Object.keys(api.getPlatforms());

        applyConfigPlugins({
          introspect: false,
          projectRoot: api.getProjectRoot(),
          platforms: platforms as ProjectInfo['platforms'],
          packageJsonPath,
          appJsonPath: path.join(api.getProjectRoot(), 'app.json'),
          iosProjectName,
          iosBundleIdentifier,
          androidPackageName,
        });
      },
      options: [
        {
          name: '--platforms <list>',
          description: 'Platforms to apply config plugins',
          parse: (val: string) => val.split(','),
        },
      ],
    });

    return {
      name: 'plugin-expo-config-plugins',
      description: 'Rock plugin for Expo Config Plugins.',
    };
  };

export default pluginExpoConfigPlugins;
