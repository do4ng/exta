import React from 'react';
import ReactDOM from 'react-dom/client';

import { router, usePathname } from '$exta-router';
import { matchUrlToRoute } from '~/utils/params';
import { hide, show } from './overlay';

function prettyURL(path: string): string {
  if (path === '.') {
    path = '';
  }
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  if (path.endsWith('/')) {
    path = path.slice(0, -1);
  }

  return path;
}

function App() {
  const location = usePathname();

  const url = decodeURIComponent(new URL(location, window.location.origin).pathname);
  const props = router.data.get(prettyURL(url).toLowerCase());
  const page = router.findPage(url);
  const Layout = router.layout._page;
  const rootElement = document.getElementById('_app');

  // reset window
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (rootElement) rootElement.scrollTo({ top: 0, behavior: 'instant' });

  // 404 page
  if (!page || props?.status === 404) {
    return React.createElement(
      Layout,
      null,
      React.createElement(router.error._page, {
        key: location,
        status: 404,
        message: 'Page not found',
      }),
    );
  }

  const Page = router.modules[page.path]._page;
  const params = matchUrlToRoute(url, { params: page.params, regex: page.regexp });

  return React.createElement(
    Layout,
    null,
    React.createElement(Page, { key: location, ...props, params }),
  );
}

// router.preloadAllPages();

let compilingInterval: any;

// compilation status overlay
if (import.meta.env.DEV) {
  let intervalIndex = 0;
  compilingInterval = setInterval(() => {
    if (intervalIndex * 250 >= 250) {
      const num = (intervalIndex % 3) + 1;
      show(`compiling${'.'.repeat(num)}`);
    }

    intervalIndex += 1;
  }, 250);
}

router.goto(window.location.href).then(() => {
  let root;
  if (import.meta.env.PROD) {
    root = ReactDOM.hydrateRoot(
      document.getElementById('_app'),
      React.createElement(App, null),
    );
  } else {
    root = ReactDOM.createRoot(document.getElementById('_app'));
    root.render(React.createElement(App, null));

    // clear overlay
    clearInterval(compilingInterval);
    hide();
  }
});
