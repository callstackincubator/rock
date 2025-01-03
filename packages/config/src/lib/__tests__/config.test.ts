import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  cleanup,
  getTempDirectory,
  writeFiles,
} from '@rnef/test-helpers';
import { afterEach, beforeEach, expect, test,vi } from 'vitest';
import { getConfig } from '../config.js';

let DIR: string;

beforeEach(() => {
  if (DIR) {
    cleanup(DIR);
  }
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup(DIR);
});

test.each([['.js'], ['.mjs'], ['.ts']])(
  'should load configs with %s extension',
  async (ext) => {
    DIR = getTempDirectory('test_config');
    writeFiles(DIR, {
      [`rnef.config${ext}`]: `module.exports = {
  plugins: {},
}`,
    });
    const config = await getConfig(DIR);
    expect(config).toMatchObject({ commands: [] });
  }
);

test('should load plugin that registers a command', async () => {
  DIR = getTempDirectory('test_config_plugins');
  writeFiles(DIR, {
    'rnef.config.js': `const TestPlugin = (config) => (api) => {
  api.registerCommand({
    name: "test-command",
    description: "Test command",
    action: () => {
      console.log("Test command executed");
    },
  });
  return {
    name: "test-plugin",
  };
};
module.exports = {
  plugins: {
    "test-plugin": TestPlugin(),
  },
};
`,
  });
  const config = await getConfig(DIR);
  expect(config).toMatchObject({
    commands: [
      {
        action: expect.any(Function),
        description: 'Test command',
        name: 'test-command',
      },
    ],
  });
});

test('should load plugin that registers a command', async () => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const config = await getConfig(
    join(__dirname, './__fixtures__/config-with-sample-plugin')
  );
  expect(config).toMatchObject({
    commands: [
      {
        action: expect.any(Function),
        description: 'Test command',
        name: 'test-command',
      },
      {
        action: expect.any(Function),
        description: 'Build android',
        name: 'android:build',
        options: [
          {
            defaultValue: 8080,
            description: 'Port to run on',
            name: '--port',
          },
          {
            description: 'remote build',
            name: '--remote',
          },
        ],
      },
      {
        action: expect.any(Function),
        description: 'Run android',
        name: 'android:run',
        options: [
          {
            defaultValue: 8080,
            description: 'Port to run on',
            name: '--port',
          },
          {
            description: 'remote build',
            name: '--remote',
          },
        ],
      },
    ],
  });
});
