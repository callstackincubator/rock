/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createRequire } from 'node:module';
import path from 'node:path';
import url from 'node:url';
import { createDevServerMiddleware } from '@react-native-community/cli-server-api';
import { color } from '@rock-js/tools';
import type {
  Reporter,
  // @ts-expect-error - https://github.com/facebook/metro/pull/1563
  TerminalReportableEvent,
  TerminalReporter,
} from 'metro';
import Metro from 'metro';
import { Terminal } from 'metro-core';
import { getDevMiddleware } from '../getReactNativeDeps.js';
import attachKeyHandlers from './attachKeyHandlers.js';
import createDevMiddlewareLogger from './createDevMiddlewareLogger.js';
import loadMetroConfig from './loadMetroConfig.js';

export type StartCommandArgs = {
  assetPlugins?: string[];
  cert?: string;
  customLogReporterPath?: string;
  host?: string;
  https?: boolean;
  maxWorkers?: string;
  key?: string;
  platforms: string[];
  port?: string;
  resetCache?: boolean;
  sourceExts?: string[];
  transformer?: string;
  watchFolders?: string[];
  config?: string;
  projectRoot?: string;
  interactive: boolean;
  clientLogs: boolean;
};

async function runServer(
  options: {
    platforms: Record<string, object>;
    reactNativeVersion: string;
    reactNativePath: string;
    root: string;
  },
  args: StartCommandArgs,
) {
  const metroConfig = await loadMetroConfig(
    {
      platforms: options.platforms,
      reactNativeVersion: options.reactNativeVersion,
      reactNativePath: options.reactNativePath,
      root: options.root,
    },
    {
      config: args.config,
      maxWorkers: args.maxWorkers,
      port: args.port,
      resetCache: args.resetCache,
      watchFolders: args.watchFolders,
      projectRoot: args.projectRoot,
      sourceExts: args.sourceExts,
    },
  );
  const hostname = args.host?.length ? args.host : 'localhost';
  const {
    projectRoot,
    server: { port },
    watchFolders,
  } = metroConfig;
  const protocol = args.https === true ? 'https' : 'http';
  const devServerUrl = url.format({ protocol, hostname, port });

  console.info(`Starting dev server on ${devServerUrl}\n`);

  if (args.assetPlugins) {
    // @ts-expect-error Assigning to readonly property
    metroConfig.transformer.assetPlugins = args.assetPlugins.map((plugin) =>
      require.resolve(plugin),
    );
  }
  // TODO(T214991636): Remove legacy Metro log forwarding
  if (!args.clientLogs) {
    // @ts-expect-error Assigning to readonly property
    metroConfig.server.forwardClientLogs = false;
  }

  let reportEvent: (event: TerminalReportableEvent) => void = () => {
    // do nothing
  };

  const terminal = new Terminal(process.stdout);
  const ReporterImpl = getReporterImpl(args.customLogReporterPath);
  // @ts-expect-error - metro types are not updated
  const terminalReporter = new ReporterImpl(terminal);

  const {
    middleware: communityMiddleware,
    websocketEndpoints: communityWebsocketEndpoints,
    messageSocketEndpoint,
    eventsSocketEndpoint,
  } = createDevServerMiddleware({
    host: hostname,
    port,
    watchFolders,
  });
  const { createDevMiddleware } = await getDevMiddleware(
    options.reactNativePath,
  );
  const { middleware, websocketEndpoints } = createDevMiddleware({
    // @ts-expect-error - projectRoot was removed from createDevMiddleware since 0.83.0, but is still required for compatibility with older RN versions
    projectRoot,
    serverBaseUrl: devServerUrl,
    logger: createDevMiddlewareLogger(terminalReporter),
  });

  const reporter: Reporter = {
    update(event: TerminalReportableEvent) {
      terminalReporter.update(event);
      if (reportEvent) {
        reportEvent(event);
      }
      if (args.interactive && event.type === 'initialize_done') {
        terminalReporter.update({
          type: 'unstable_server_log',
          level: 'info',
          data: `Dev server ready. ${color.dim('Press Ctrl+C to exit.')}`,
        });
        attachKeyHandlers({
          devServerUrl,
          // @ts-expect-error - TBD
          messageSocket: messageSocketEndpoint,
          reporter: terminalReporter,
        });
      }
    },
  };
  // @ts-expect-error Assigning to readonly property
  metroConfig.reporter = reporter;

  await Metro.runServer(metroConfig, {
    host: args.host,
    secure: args.https,
    secureCert: args.cert,
    secureKey: args.key,
    unstable_extraMiddleware: [communityMiddleware, middleware],
    websocketEndpoints: {
      ...communityWebsocketEndpoints,
      ...websocketEndpoints,
    },
  });

  reportEvent = eventsSocketEndpoint.reportEvent;
}

const require = createRequire(import.meta.url);

function getReporterImpl(customLogReporterPath?: string): TerminalReporter {
  if (customLogReporterPath == null) {
    try {
      return require('metro').TerminalReporter;
    } catch {
      // Fallback to legacy path for Metro < 0.83
      return require('metro/src/lib/TerminalReporter');
    }
  }
  try {
    // First we let require resolve it, so we can require packages in node_modules
    // as expected. eg: require('my-package/reporter');
    return require(customLogReporterPath);
  } catch (e) {
    if (e instanceof Error && 'code' in e && e.code !== 'MODULE_NOT_FOUND') {
      throw e;
    }
    // If that doesn't work, then we next try relative to the cwd, eg:
    // require('./reporter');
    return require(path.resolve(customLogReporterPath));
  }
}

export default runServer;
