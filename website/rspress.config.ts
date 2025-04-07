import * as path from 'node:path';
import { pluginCallstackTheme } from '@callstack/rspress-theme/plugin';
import { defineConfig } from 'rspress/config';
import vercelPluginAnalytics from 'rspress-plugin-vercel-analytics';

export default defineConfig({
  plugins: [pluginCallstackTheme(), vercelPluginAnalytics()],
  root: path.join(__dirname, 'docs'),
  title: 'React Native Enterprise Framework',
  icon: '/rspress-icon.png',
  outDir: 'build',
  route: {
    cleanUrls: true
  },
  // logo: {
  //   light: '/rspress-light-logo.png',
  //   dark: '/rspress-dark-logo.png',
  // },
  themeConfig: {
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com/callstack/rnef',
      },
    ],
  },
});
