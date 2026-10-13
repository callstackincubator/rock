export * from './lib/pluginExpoConfigPlugins.js';
export {
  default as withRockAutolinking,
  patchAndroidBuildGradle,
  patchAndroidSettingsGradle,
  patchPodfile,
  patchXcodeProject,
} from './lib/config-plugin/withRockAutolinking.js';
