import React from 'react';
import ReactDOM from 'react-dom/client';

import { router, useLocation } from '$exta-router';
import { matchUrlToRoute } from '~/utils/params';

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

router.preloadAllPages();

router.goto(window.location.href).then(() => {
  const root = ReactDOM.createRoot(document.getElementById('_app'));

  root.render(React.createElement(App, null));
});

function App() {
  const location = useLocation();

  const url = new URL(location, window.location.origin).pathname;
  const page = router.findPage(url);
  const props = router.data.get(prettyURL(url))?.props;
  const params = matchUrlToRoute(url, { params: page.params, regex: page.regexp });

  if (!page) {
    throw new Error('Cannot find page');
  }

  const Page = router.modules[page.path]._page;
  const Layout = router.layout._page;

  return React.createElement(
    Layout,
    null,
    React.createElement(Page, { key: location, ...props, params }),
  );
}
