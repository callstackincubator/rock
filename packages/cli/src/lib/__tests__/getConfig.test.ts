// import { vi, expect, beforeEach, afterEach, test } from 'vitest';
// import { getConfig } from '@callstack/rnef-config';
// import {
//   cleanup,
//   writeFiles,
//   getTempDirectory,
// } from '@callstack/rnef-test-helpers';

// const DIR = getTempDirectory('test_config');

// beforeEach(() => {
//   cleanup(DIR);
//   vi.resetModules();
//   vi.clearAllMocks();
// });

// afterEach(() => cleanup(DIR));

// test.each([['.js'], ['.mjs'], ['.ts']])(
//   'should load configs with %s extension',
//   async (ext) => {
//     writeFiles(DIR, {
//       [`rnef.config${ext}`]: `module.exports = {
//       plugins: {}
//     }`,
//     });
//     expect(await getConfig(DIR)).toMatchObject({ commands: [] });
//   }
// );

// test('should load plugin that registers a command', async () => {
//   writeFiles(DIR, {
//     'rnef.config.js': `module.exports = {
//       plugins: {
//         'test-plugin': function TestPlugin(config) {
//           return {
//             name: 'test-plugin',
//             commands: [
//               {
//                 name: 'test-command',
//                 description: 'Test command',
//                 action: () => { console.log('Test command executed'); },
//               },
//             ],
//           };
//         }
//       }
//     }`,
//   });

//   expect(await getConfig(DIR)).toMatchObject({
//     commands: [
//       {
//         name: 'test-command',
//         description: 'Test command',
//         action: expect.any(Function),
//       },
//     ],
//   });
// });
