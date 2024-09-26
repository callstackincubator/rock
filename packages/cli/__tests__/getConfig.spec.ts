import { getConfig } from '../src/lib/getConfig';
import { cleanup, writeFiles, getTempDirectory } from '../jest/helpers';

const DIR = getTempDirectory('test_config');

beforeEach(() => {
  cleanup(DIR);
  jest.resetModules();
  jest.clearAllMocks();
});

afterEach(() => cleanup(DIR));

test.each([['.js'], ['.mjs'], ['.ts']])(
  'should load configs with %s extension',
  async (ext) => {
    writeFiles(DIR, {
      [`rnef.config${ext}`]: `module.exports = {
      projectConfig: {}
    }`,
    });
    expect(await getConfig(DIR)).toMatchObject({ projectConfig: {} });
  }
);

test('should load plugin that registers a command', async () => {
  writeFiles(DIR, {
    'rnef.config.js': `module.exports = {
      plugins: {
        'test-plugin': function TestPlugin(config) {
          return {
            name: 'test-plugin',
            commands: [
              {
                name: 'test-command',
                description: 'Test command',
                action: () => { console.log('Test command executed'); },
              },
            ],
          };
        }
      }
    }`,
  });

  expect(await getConfig(DIR)).toMatchObject({
    commands: [
      {
        name: 'test-command',
        description: 'Test command',
        action: expect.any(Function),
      },
    ],
  });
});
