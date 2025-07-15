import * as path from 'node:path';
import { pluginCallstackTheme } from '@callstack/rspress-theme/plugin';
import { pluginLlms } from '@rspress/plugin-llms';
import { pluginOpenGraph } from 'rsbuild-plugin-open-graph';
import { defineConfig } from 'rspress/config';
import pluginSitemap from 'rspress-plugin-sitemap';
import vercelPluginAnalytics from 'rspress-plugin-vercel-analytics';

export default defineConfig({
  root: path.join(__dirname, 'src'),
  title: 'React Native Enterprise Framework',
  icon: '/logo.svg',
  outDir: 'build',
  route: {
    cleanUrls: true,
  },
  logo: {
    light: '/logo-light.svg',
    dark: '/logo-dark.svg',
  },
  builderConfig: {
    plugins: [
      pluginOpenGraph({
        title: 'React Native Enterprise Framework',
        type: 'website',
        url: 'https://rnef.dev',
        image: 'https://rnef.dev/og-image.jpg',
        description:
          'Easy to adopt. Simple to scale. Built for flexibility from day one',
        twitter: {
          site: '@rnef_dev',
          card: 'summary_large_image',
        },
      }),
    ],
  },
  themeConfig: {
    socialLinks: [
      {
        icon: 'github',
        mode: 'link',
        content: 'https://github.com/callstack/rnef',
      },
    ],
    footer: {
      message:
        'Copyright © 2025 <a href="https://callstack.com">Callstack</a>.',
    },
  },
  globalStyles: path.join(__dirname, 'theme/styles.css'),
  plugins: [
    pluginCallstackTheme(),
    // @ts-expect-error outdated @rspress/shared declared as dependency
    vercelPluginAnalytics(),
    pluginLlms({
      exclude: ({ page }) => page.routePath.includes('404'),
    }),
    // @ts-expect-error outdated @rspress/shared declared as dependency
    pluginSitemap({ domain: 'https://rnef.dev' }),
  ],
});
