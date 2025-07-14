import {
  HomeBanner,
  HomeFeature,
  HomeFooter,
  HomeHero,
  OutlineCTA,
  PrevNextPage,
} from '@callstack/rspress-theme';
import {
  HomeLayout as RspressHomeLayout,
  Layout as RspressLayout,
} from 'rspress/theme';

// You can customize the default Layout and HomeLayout like this:
const Layout = () => (
  <RspressLayout afterOutline={<OutlineCTA href="https://callstack.com" />} />
);

const HomeLayout = () => (
  <RspressHomeLayout
    afterFeatures={
      <>
        <HomeBanner href="https://callstack.com" />
        <HomeFooter />
      </>
    }
  />
);

// Export your custom layouts and any components you want available via '@theme'
export { Layout, HomeLayout, PrevNextPage, HomeFeature, HomeHero };
// Don't forget to export the default theme components which are not overridden
export * from 'rspress/theme';
