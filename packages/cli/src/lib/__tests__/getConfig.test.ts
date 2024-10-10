import { vi, expect, beforeEach, afterEach, test } from 'vitest';
import { getConfig } from '@callstack/rnef-config';
import {
  cleanup,
  writeFiles,
  getTempDirectory,
} from '@callstack/rnef-test-helpers';

const DIR = getTempDirectory('test_config');

beforeEach(() => {
  cleanup(DIR);
  vi.resetModules();
  vi.clearAllMocks();
});

afterEach(() => cleanup(DIR));

test.each([['.js'], ['.mjs'], ['.ts']])(
  'should load configs with %s extension',
  async (ext) => {
    writeFiles(DIR, {
      [`rnef.config${ext}`]: `module.exports = {
      plugins: {}
    }`,
    });
    expect(await getConfig(DIR)).toMatchObject({ commands: [] });
  }
);

test('should load plugin that registers a command', async () => {
  writeFiles(DIR, {
    'rnef.config.js': `module.exports = {
      plugins: {
        'test-plugin': const TestPlugin = (config) => (api) => {
          api.registerCommand({
            name: 'test-command',
            description: 'Test command',
            action: () => { console.log('Test command executed'); },
          });
          return {
            name: 'test-plugin',
          };
        }
      }
    }`,
  });

  expect(await getConfig(DIR)).toMatchObject({
    commands: [],
  });
});
