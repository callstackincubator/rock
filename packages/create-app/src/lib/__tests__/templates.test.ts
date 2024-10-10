import { expect, test } from 'vitest';
import path from 'node:path';
import { resolveTemplate, TEMPLATES } from '../templates.js';

test('resolveTemplateName with built-in templates', () => {
  const expectedPath = path.resolve(
    __dirname,
    '../../../../../',
    'templates/rnef-template-default'
  );
  console.log('Expected path', expectedPath);
  console.log('Resolved path', resolveTemplate(TEMPLATES, 'default'));
  expect(resolveTemplate(TEMPLATES, 'default')).toEqual({
    name: 'default',
    localPath: expectedPath,
  });
});

test('resolveTemplateName with local paths', () => {
  expect(resolveTemplate(TEMPLATES, './directory/template-1')).toEqual({
    name: 'template-1',
    localPath: path.resolve('./directory/template-1'),
  });

  expect(resolveTemplate(TEMPLATES, '../../up/up/away/template-2')).toEqual({
    name: 'template-2',
    localPath: path.resolve('../../up/up/away/template-2'),
  });

  expect(resolveTemplate(TEMPLATES, '/absolute/path/template-3')).toEqual({
    name: 'template-3',
    localPath: '/absolute/path/template-3',
  });

  expect(
    resolveTemplate(TEMPLATES, 'file:///url-based/path/template-4')
  ).toEqual({
    name: 'template-4',
    localPath: '/url-based/path/template-4',
  });

  expect(resolveTemplate(TEMPLATES, './directory/template-5.tgz')).toEqual({
    name: 'template-5',
    localPath: path.resolve('./directory/template-5.tgz'),
  });

  expect(resolveTemplate(TEMPLATES, '../up/template-6.tar')).toEqual({
    name: 'template-6',
    localPath: path.resolve('../up/template-6.tar'),
  });

  expect(resolveTemplate(TEMPLATES, '/root/directory/template-7.tgz')).toEqual({
    name: 'template-7',
    localPath: '/root/directory/template-7.tgz',
  });
});
