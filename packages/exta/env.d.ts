/* eslint-disable @typescript-eslint/no-misused-new */

/* eslint-disable @typescript-eslint/no-explicit-any */
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

  interface RouteResult {
    regex: RegExp;
    params: string[];
  }

  export function useLocation(): string;

  export function useRouter(): {
    location: string;
    push: (path: any) => void;
    replace: (path: any) => void;
  };

  export function useParams(): {
    [key: string]: string;
  };

  export function usePathname(): string;
  export function useSearchQuery(): URLSearchParams;

  export interface Router {
    routes: PageManifest[];

    layout: any;

    error: any;

    modules: Record<string, any>;

    data: Map<string, any>;

    constructor(routes: PageManifest[]);

    preload(page: PageManifest): void;

    preloadAllPages(): void;

    loadLayout(): Promise<any>;

    loadError(): Promise<any>;

    findPage(url: string): PageManifest;

    goto(href: string): Promise<{ modules: any; data: any }>;
  }

  export const router: Router;
}
