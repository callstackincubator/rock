import { createRequire } from 'node:module';
import type devMiddleware from '@react-native/dev-middleware';

export async function getDevMiddleware(
  reactNativePath: string,
): Promise<typeof devMiddleware> {
  const require = createRequire(import.meta.url);
  const reactNativeCommunityCliPluginPath = require.resolve(
    '@react-native/community-cli-plugin',
    { paths: [reactNativePath] },
  );

  const devMiddlewarePath = require.resolve('@react-native/dev-middleware', {
    paths: [reactNativeCommunityCliPluginPath],
  });

  return import(devMiddlewarePath);
}

export async function getReactNativeCommunityCliPlugin(
  reactNativePath: string,
) {
  const require = createRequire(import.meta.url);
  const reactNativeCommunityCliPluginPath = require.resolve(
    '@react-native/community-cli-plugin',
    { paths: [reactNativePath] },
  );

  return import(reactNativeCommunityCliPluginPath);
}
