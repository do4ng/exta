export {};

declare global {
  interface SSRData {
    pathname: string;
    params: Record<string, string>;
    preload: string[];
    head: { type: 'preload-data-link' | 'html'; data: string }[];
  }

  var __EXTA_SSR_DATA__: SSRData;
}
