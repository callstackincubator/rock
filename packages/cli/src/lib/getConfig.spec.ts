import { getConfig } from './getConfig';
import { cleanup, writeFiles, getTempDirectory } from '../../jest/helpers';

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
