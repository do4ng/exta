import { PAGES_MANIFEST as manifest, PageManifest } from '$exta-manifest';
import pages from '$exta-pages';
import React from 'react';
import { isSamePathClient, removeExtension } from '~/utils/clientPath';
import { DefaultLayout } from './components/_layout.';
import { DefaultError } from './components/_error';
import { matchUrlToRoute } from '~/utils/params';
import { findPage as findPageDev } from '~/utils/find';

const isServerSide = typeof window === 'undefined';

const staticManifest: Record<string, string | null> = isServerSide
  ? {}
  : JSON.parse(document.getElementById('__STATIC_MANIFEST__')?.innerText || '{}');

declare global {
  interface Window {
    __EXTA_PAGEMAP__: Record<string, string>;
  }
}

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

export async function loadPageData(page: string): Promise<any> {
  if (import.meta.env.DEV) {
    const res = await fetch(`/.exta/__page_data?page=${page}`);
    return await res.json();
  } else {
    const id = staticManifest[page.replace(/\//g, '_') + '.json'];
    if (id === null) {
      return { props: {} };
    } else if (id === undefined) {
      return { props: {}, status: 404 };
    }
    const target = `/data/${id}.json`;

    try {
      const res = await fetch(target);
      return { props: await res.json() };
    } catch (__e) {
      console.error(`Cannot find page (fetching ${target}) - ${__e.message}`);
      return { props: {}, status: 404 };
    }
  }
}

function createHistoryStore() {
  if (isServerSide) {
    return {
      subscribe() {
        return () => {};
      },
      getSnapshot() {
        return global.__EXTA_SSR_DATA__.pathname;
      },
      push() {},
      replace() {},
    };
  }

  const listeners = new Set<() => void>();

  const notify = () => {
    for (const l of listeners) l();
  };

  const wrap = (method) => {
    const original = history[method];
    return function (...args) {
      original.apply(this, args);
      notify();
    };
  };

  history.pushState = wrap('pushState');
  history.replaceState = wrap('replaceState');

  window.addEventListener('popstate', notify);

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return decodeURIComponent(
        window.location.pathname + window.location.search + window.location.hash,
      );
    },
    push(path) {
      if (path.startsWith('#')) {
        // disable push state when only hash changed
        location.hash = path;
        return;
      }

      history.pushState({}, '', path);
      notify();
    },
    replace(path) {
      history.replaceState({}, '', path);
      notify();
    },
  };
}

const historyStore = createHistoryStore();

export function useLocation() {
  if (isServerSide) return global.__EXTA_SSR_DATA__.pathname || '/.exta/ssr:unknown';

  return React.useSyncExternalStore(
    historyStore.subscribe,
    historyStore.getSnapshot,
    () => {
      return typeof window === 'undefined'
        ? global?.__EXTA_SSR_DATA__?.pathname
        : historyStore.getSnapshot();
    },
  );
}

function useURL() {
  return new URL(useLocation(), 'http://localhost/');
}

export function usePathname() {
  return useURL().pathname;
}

export function useSearchQuery() {
  return useURL().searchParams;
}

export function useRouter() {
  const location = useLocation();
  return {
    location,
    push: historyStore.push,
    replace: historyStore.replace,
  };
}

export function useParams() {
  if (isServerSide) {
    return global.__EXTA_SSR_DATA__.params || {};
  }

  const location = usePathname();
  const page = window._exta_router.findPage(location);

  if (!page) {
    const message = `[exta-router] Cannot generate params: Route match for "${location}" is missing required data.`;
    window.__overlay__.show(
      `ERROR: ${message}\nSee the console for more details.`,
      'color: #ff3c3c',
    );
    throw new Error(message);
  }

  return matchUrlToRoute(location, { params: page.params, regex: page.regexp });
}

export class Router {
  routes: PageManifest[];

  // layout component
  layout: any;

  // error page
  error: any;

  modules: Record<string, any> = {};

  data: Map<string, any> = new Map();

  loadedModules: Map<string, any> = new Map();

  constructor(routes: PageManifest[]) {
    this.routes = routes;
  }

  async prefetch(url: string) {
    const _url = prettyURL(url);
    if (this.data.has(_url)) return;
    this.data.set(_url, await loadPageData(url));
  }

  getHref(page: PageManifest) {
    if (import.meta.env.DEV) {
      return `/.exta/${page.buildPath.replace(/\\/g, '/')}`;
    }

    const windowObject = window.__EXTA_PAGEMAP__;

    for (const pageMapKey in windowObject) {
      if (
        isSamePathClient(removeExtension(pageMapKey), removeExtension(page.originalPath))
      ) {
        return `/${windowObject[pageMapKey]}`;
      }
    }
  }

  preload(page: PageManifest) {
    const href = this.getHref(page);

    if (!href) return;

    const preloaded = document.getElementsByTagName('link');

    for (const preloadScript of [...preloaded]) {
      if (preloadScript.href === new URL(href, window.location.origin).href) return;
    }

    const preload = document.createElement('link');
    preload.rel = 'prefetch';
    preload.href = href;
    document.head.appendChild(preload);
  }

  preloadAllPages() {
    for (const route of this.routes) {
      this.preload(route);
    }
  }

  async loadLayout() {
    if (this.layout) return this.layout;

    if (!pages['[layout]']) {
      this.layout = { _page: DefaultLayout };
    } else {
      this.layout = await pages['[layout]']();
    }

    return this.layout;
  }

  async loadError() {
    if (this.error) return this.error;

    if (!pages['[error]']) {
      this.error = { _page: DefaultError };
    } else {
      this.error = await pages['[error]']();
    }

    return this.error;
  }

  findPage(url: string) {
    url = url.toLowerCase();
    return findPageDev(url, this.routes);
  }

  async goto(href: string) {
    const url = decodeURIComponent(
      new URL(href, window.location.origin).pathname,
    ).toLowerCase();
    const page = this.findPage(url);

    await this.loadLayout();
    await this.loadError();

    if (!page) return;

    const pageModule = this.loadedModules.has(page.path)
      ? this.loadedModules.get(page.path)
      : this.loadedModules.set(page.path, await pages[page.path]()).get(page.path);

    const _url = prettyURL(url);
    const data = this.data.has(_url)
      ? this.data.get(_url)
      : this.data.set(_url, await loadPageData(url)).get(_url);

    this.modules[page.path] = pageModule;

    if (data?.status === 404) {
      return;
    }

    return { module: this.modules, data };
  }
}

export const router = new Router(manifest);

if (!isServerSide) {
  window._exta_router = router as any as import('$exta-router').Router;
  window._exta_useRouter = useRouter as any as typeof import('$exta-router').useRouter;
}

declare global {
  interface Window {
    _exta_router: import('$exta-router').Router;
    _exta_useRouter: typeof import('$exta-router').useRouter;
  }
}
