/* eslint-disable @typescript-eslint/no-explicit-any */
import { PAGES_MANIFEST as manifest, PageManifest } from '$exta-manifest';
import pages from '$exta-pages';
import React from 'react';
import { isSamePathClient, removeExtension } from '~/utils/clientPath';
import { DefaultLayout } from './components/_layout.';
import { DefaultError } from './components/_error';

const isServerSide = typeof window === 'undefined';

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
    try {
      const res = await fetch(`/data/${page.replace(/\//g, '_')}.json`);
      return { props: await res.json() };
    } catch (__e) {
      console.error(
        `Cannot find page (fetching ${`/data/${page.replace(/\//g, '_')}.json`}) - ${__e.message}`,
      );
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
      return window.location.pathname + window.location.search + window.location.hash;
    },
    push(path) {
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
  if (isServerSide) return global.__EXTA_SSR_DATA__.pathname;

  return React.useSyncExternalStore(historyStore.subscribe, historyStore.getSnapshot);
}

export function useRouter() {
  const location = useLocation();
  return {
    location,
    push: historyStore.push,
    replace: historyStore.replace,
  };
}

export class Router {
  routes: PageManifest[];

  // layout component
  layout: any;

  // error page
  error: any;

  modules: Record<string, any> = {};

  data: Map<string, any> = new Map();

  constructor(routes: PageManifest[]) {
    this.routes = routes;
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
    const preload = document.createElement('link');
    preload.rel = 'modulepreload';
    preload.as = 'script';
    preload.href = this.getHref(page);
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
    for (const route of this.routes) {
      if (route.regexp.test(url)) {
        return route;
      }
    }
    return null;
  }

  async goto(href: string) {
    const url = new URL(href, window.location.origin).pathname;
    const page = this.findPage(url);

    await this.loadLayout();
    await this.loadError();

    if (!page) return;

    const pageModule = await pages[page.path]();
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
