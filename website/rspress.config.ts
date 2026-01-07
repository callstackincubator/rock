import path from 'node:path';
import url from 'node:url';
import { withCallstackPreset } from '@callstack/rspress-preset';
import { defineConfig } from '@rspress/core';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default withCallstackPreset(
  {
    context: __dirname,
    docs: {
      title: 'Rock',
      description: 'Easy to adopt. Simple to scale. Ship everywhere.',
      editUrl: 'https://github.com/callstack/rock/edit/main/website/src',
      icon: '/logo.svg',
      logoLight: '/logo-light.svg',
      logoDark: '/logo-dark.svg',
      ogImage: '/og-image.jpg',
      rootDir: 'src',
      rootUrl: 'https://rockjs.dev',
      socials: {
        github: 'https://github.com/callstack/rock',
        x: 'https://x.com/rockjs_dev',
        discord: 'https://discord.gg/cF3DRqwg',
      },
    },
    theme: {
      content: {
        outlineCTAHeadline: 'Scaling your React Native stack?',
        outlineCTADescription:
          'We helped hundreds of teams reach billions of users.',
        outlineCTAButtonText: "Let's talk",
      },
    },
  },
  defineConfig({
    outDir: 'build',
  }),
);
