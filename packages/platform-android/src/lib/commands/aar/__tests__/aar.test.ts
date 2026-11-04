import * as tools from '@rock-js/tools';
import { spawn } from '@rock-js/tools';
import { test, vi } from 'vitest';
import { options as packageAarOptions,packageAar } from '../packageAar.js';
import {
  options as publishLocalAarOptions,
  publishLocalAar,
} from '../publishLocalAar.js';

const aarProject = { sourceDir: '/android', moduleName: 'reactnativeapp' };

const spinnerMock = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  message: vi.fn(),
}));

vi.spyOn(tools, 'spinner').mockImplementation(() => spinnerMock);

beforeEach(() => {
  vi.clearAllMocks();
});

test('packageAar runs the assemble task for the module', async () => {
  await packageAar(aarProject, 'Release');

  expect(spawn).toBeCalledWith(
    './gradlew',
    ['reactnativeapp:assembleRelease', '-x', 'lint'],
    { cwd: '/android' },
  );
});

test('packageAar passes extra params to Gradle', async () => {
  await packageAar(aarProject, 'Release', ['-PmyProperty=value', '--offline']);

  expect(spawn).toBeCalledWith(
    './gradlew',
    [
      'reactnativeapp:assembleRelease',
      '-x',
      'lint',
      '-PmyProperty=value',
      '--offline',
    ],
    { cwd: '/android' },
  );
});

test('publishLocalAar passes extra params to Gradle', async () => {
  await publishLocalAar(aarProject, ['-PmyProperty=value']);

  expect(spawn).toBeCalledWith(
    './gradlew',
    ['reactnativeapp:publishToMavenLocal', '-x', 'lint', '-PmyProperty=value'],
    { cwd: '/android' },
  );
});

test.each([
  ['package:aar', packageAarOptions],
  ['publish-local:aar', publishLocalAarOptions],
])('%s parses --extra-params into Gradle arguments', (_, options) => {
  const extraParams = options.find(
    (option) => option.name === '--extra-params <string>',
  );

  expect(extraParams?.parse?.('-PmyProperty=value --offline')).toEqual([
    '-PmyProperty=value',
    '--offline',
  ]);
});
