import path from 'node:path';
import { expect, test } from 'vitest';
import { resolveTemplate, TEMPLATES } from '../templates.js';

test('resolveTemplateName with built-in templates', () => {
  expect(resolveTemplate(TEMPLATES, 'default')).toEqual({
    type: 'npm',
    name: 'default',
    displayName: 'default',
    packageName: '@rock-js/template-default',
    version: 'latest',
    directory: '.',
  });
});

test('resolveTemplateName with local paths', () => {
  expect(resolveTemplate(TEMPLATES, './directory/template-1')).toEqual({
    type: 'local',
    name: 'template-1',
    displayName: 'template-1',
    localPath: path.resolve('./directory/template-1'),
    directory: '.',
    packageName: 'template-1',
  });

  expect(resolveTemplate(TEMPLATES, '../../up/up/away/template-2')).toEqual({
    type: 'local',
    name: 'template-2',
    displayName: 'template-2',
    localPath: path.resolve('../../up/up/away/template-2'),
    directory: '.',
    packageName: 'template-2',
  });

  expect(resolveTemplate(TEMPLATES, '/absolute/path/template-3')).toEqual({
    type: 'local',
    name: 'template-3',
    displayName: 'template-3',
    localPath: '/absolute/path/template-3',
    directory: '.',
    packageName: 'template-3',
  });

  expect(
    resolveTemplate(TEMPLATES, 'file:///url-based/path/template-4'),
  ).toEqual({
    type: 'local',
    name: 'template-4',
    displayName: 'template-4',
    localPath: '/url-based/path/template-4',
    directory: '.',
    packageName: 'template-4',
  });

  expect(resolveTemplate(TEMPLATES, './directory/template-5.tgz')).toEqual({
    type: 'local',
    name: 'template-5',
    displayName: 'template-5',
    localPath: path.resolve('./directory/template-5.tgz'),
    directory: '.',
    packageName: 'template-5',
  });

  expect(resolveTemplate(TEMPLATES, '../up/template-6.tar')).toEqual({
    type: 'local',
    name: 'template-6',
    displayName: 'template-6',
    localPath: path.resolve('../up/template-6.tar'),
    directory: '.',
    packageName: 'template-6',
  });

  expect(resolveTemplate(TEMPLATES, '/root/directory/template-7.tgz')).toEqual({
    type: 'local',
    name: 'template-7',
    displayName: 'template-7',
    localPath: '/root/directory/template-7.tgz',
    directory: '.',
    packageName: 'template-7',
  });
});

test('resolveTemplateName with npm packages', () => {
  expect(resolveTemplate(TEMPLATES, 'package-name')).toEqual({
    type: 'npm',
    name: 'package-name',
    displayName: 'package-name',
    directory: '.',
    packageName: 'package-name',
    version: 'latest',
  });
  expect(resolveTemplate(TEMPLATES, 'package-name@1.2.3')).toEqual({
    type: 'npm',
    name: 'package-name',
    displayName: 'package-name',
    directory: '.',
    packageName: 'package-name',
    version: '1.2.3',
  });
  expect(resolveTemplate(TEMPLATES, '@scoped/package-name@1.2.3')).toEqual({
    type: 'npm',
    name: '@scoped/package-name',
    displayName: '@scoped/package-name',
    directory: '.',
    packageName: '@scoped/package-name',
    version: '1.2.3',
  });
});
