/* eslint-disable @typescript-eslint/no-misused-new */

// $exta-manifest module is page map for internal core routing.
declare module '$exta-manifest' {
  export interface PageManifest {
    regexp: RegExp;
    path: string;
    originalPath: string;
    params: string[];
    buildPath: string;
    buildServerPath: string;
    allowedParams?: Record<string, string[]>;
  }

  export const PAGES_MANIFEST: PageManifest[];
}

declare module '$exta-pages' {
  const pages: Record<string, () => Promise<any>>;
  export = pages;
}

declare module '$exta-router' {
  import { PageManifest } from '$exta-manifest';

  type ExtaLayout = (props: { children: React.ReactNode }) => React.ReactNode;
  type ExtaErrorComponent = (props: ErrorProps) => React.ReactNode;

  interface RouteResult {
    regex: RegExp;
    params: string[];
  }

  /**
   * Return `url.location`.
   */
  export function useLocation(): string;

  export function useRouter(): {
    location: string;
    push: (path: any) => void;
    replace: (path: any) => void;
  };

  export function useParams(): {
    [key: string]: string;
  };

  /**
   * Return `url.pathname`.
   */
  export function usePathname(): string;

  /**
   * Return `url.searchQuery`.
   */
  export function useSearchQuery(): URLSearchParams;

  export interface Router {
    routes: PageManifest[];

    /**
     * Layout component
     */
    layout: { _page: ExtaLayout };

    /**
     * Error component
     */
    error: { _page: ExtaErrorComponent };

    /**
     * Loaded page components
     */
    modules: Record<string, any>;

    /**
     * Loaded page data (`.json`).
     */
    data: Map<string, any>;

    constructor(routes: PageManifest[]);

    /**
     * Preload page module (`.js` file)
     * ```ts
     * router.preload(router.findPage("/"));
     * ```
     * @param page target page
     */
    preload(page: PageManifest): void;

    /**
     * Preload all page modules
     */
    preloadAllPages(): void;

    /**
     * Load layout component (`_layout.tsx` or default layout)
     */
    loadLayout(): Promise<any>;

    /**
     * Load layout component (`_error.tsx` or default error component)
     */
    loadError(): Promise<any>;

    /**
     * Find page and return page info
     * @param url target page url
     */
    findPage(url: string): PageManifest;

    /**
     * Load all page modules including layout, error and page component
     * @param href target url
     */
    goto(href: string): Promise<{ modules: any; data: any }>;

    /**
     * Fetch page data (`.json` file)
     * @param url target page url
     */
    prefetch(url: string): Promise<void>;
  }

  export const router: Router;
}

interface Window {
  __overlay__: {
    show(text: string, style?: string): void;
    hide(): void;
    setText(text: string): void;
  };
}
