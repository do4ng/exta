import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';

import { router, usePathname, useSearchQuery } from '$exta-router';
import { matchUrlToRoute } from '~/utils/params';
import { hide, show } from './overlay';
import ErrorBoundary, { ErrorBoundaryProps } from './components/error';

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
  const isFirstRender = useRef(true);
  const location = usePathname();
  const search = useSearchQuery();
  const url = decodeURIComponent(new URL(location, window.location.origin).pathname);
  const props = router.data.get(prettyURL(url).toLowerCase());
  const page = router.findPage(url);
  const Layout = router.layout._page;
  const rootElement = document.getElementById('_app');

  // Reset Window on page moving
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (rootElement) rootElement.scrollTo({ top: 0, behavior: 'instant' });
  }, [location, search]);

  // Error Component
  const createError = (props: any) =>
    React.createElement(
      Layout,
      null,
      React.createElement(router.error._page, {
        key: location,
        ...props,
      }),
    );

  if (!page || props?.status === 404) {
    // 404 page

    return createError({
      key: location,
      status: 404,
      message: 'Page not found',
    });
  } else if (props?.status === 500) {
    // 500 page

    show(`ERROR: ${props.detail}`, true);
    return createError({
      key: location,
      status: 500,
      message: 'Internal Server Error',
    });
  }

  if (!router.modules[page.path]?._page) {
    console.error(`Cannot find page module (path: ${page.path})`);
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
  const mainComponent = React.createElement(
    // Error Catcher
    ErrorBoundary,
    {
      errorComponent: router.error._page,
      onError(error) {
        console.error(error);
        if (import.meta.env.PROD) {
          show(`An internal client error occurred. See the console for details.`, true);
        } else {
          show(`ERROR: ${error.message}`, true);
        }
      },
    } as ErrorBoundaryProps,
    React.createElement(App, null),
  );
  if (import.meta.env.PROD) {
    // on Production Mode
    // SSR hydration

    ReactDOM.hydrateRoot(document.getElementById('_app'), mainComponent);
  } else {
    // on Development Mode
    // just rendering
    const root = ReactDOM.createRoot(document.getElementById('_app'));
    root.render(mainComponent);

    // clear overlay
    clearInterval(compilingInterval);
    hide();
  }
});
