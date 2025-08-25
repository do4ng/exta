import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

import { renderToString } from 'react-dom/server';
import React from 'react';
import { ViteDevServer, Manifest } from 'vite';

import { DefaultError } from '~/client/components/_error';
import { DefaultLayout } from '~/client/components/_layout.';
import { PAGE_STATIC_PARAMS_FUNCTION } from '~/compiler/constants';
import { compilePages, convertToRegex } from '~/core/routing';
import { matchUrlToRoute } from '~/utils/params';
import { changeExtension } from '~/utils/path';
import { replaceParamsInRoute } from './shared';

// collect vite css dependencies
export function collectCssFiles(manifest: Manifest, entry: string): string[] {
  const result: string[] = [];
  const visited = new Set<string>();

  function recurse(key: string) {
    if (visited.has(key)) return;
    visited.add(key);

    const chunk = manifest[key];
    if (!chunk) return;

    if (chunk.css) {
      result.push(...chunk.css);
    }

    if (chunk.imports) {
      for (const imported of chunk.imports) {
        recurse(imported);
      }
    }
  }

  recurse(entry);
  return result;
}

// render page on server side
export const serverRendering = (
  children: any,
  Layout: any,
  props: object,
  template: string,
  cssFiles: string[],
  staticManifest: Record<string, string | null>,
  path: string,
  scripts: string[],
) => {
  global.__EXTA_SSR_DATA__ = {
    pathname: path,
    params: (props as any).params || {},
    preload: [],
    head: [],
  };

  const component = React.createElement(children, {
    ...props,
    key: path,
  });
  const string = renderToString(React.createElement(Layout, null, component));

  const insert = [];

  // stylesheet assets from vite entrypoints
  for (const cssChunk of cssFiles) {
    insert.push(`<link rel="stylesheet" href="/${cssChunk}" />`);
  }

  // prefetch request from development stage
  for (const preloadFile of global.__EXTA_SSR_DATA__.preload) {
    insert.push(`<link rel="prefetch" href="${preloadFile}" />`);
  }

  // scripts for corresponding page
  for (const script of scripts) {
    insert.push(`<link rel="modulepreload" href="/${script}"></link>`);
  }

  // static props link
  insert.push(
    `<script id="__STATIC_MANIFEST__" type="application/json">${JSON.stringify(staticManifest)}</script>`,
  );

  // From (<Head />)
  insert.push(...global.__EXTA_SSR_DATA__.head);

  template = template.replace(/<head[^>]*>([\s\S]*?)<\/head>/, (match, inner) => {
    return `<head${match.match(/<head([^>]*)>/)?.[1] || ''}>${insert.join('')}\n${inner}</head>`;
  });

  return template.replace('<div id="_app"></div>', `<div id="_app">${string}</div>`);
};

export async function createStaticHTML(
  pages: Awaited<ReturnType<typeof compilePages>>,
  outdir: string,
  vite: ViteDevServer,
  template: string,
  manifest: Manifest,
  staticManifest: Record<string, string | null>,
) {
  // load layout component (/pages/_layout or default layout)
  const getLayout = async (): Promise<any> => {
    if (!pages['[layout]']) return DefaultLayout;
    return (await vite.ssrLoadModule(pages['[layout]'].client))._page;
  };

  // load error component (/pages/_error or default layout)
  const getError = async (): Promise<any> => {
    if (!pages['[error]']) return DefaultError;
    return (await vite.ssrLoadModule(pages['[error]'].client))._page;
  };

  // load page component
  const getClientComponent = async (path: string): Promise<any> => {
    return (await vite.ssrLoadModule(path))._page;
  };

  const ErrorComponent = await getError();
  const Layout = await getLayout();

  const layoutCompiledFile =
    `.exta/${pages['[layout]'].client.replace(/^[^/\\]+[\\/]/, '')}`.replace(/\\/g, '/');
  const layoutCss = pages['[layout]']
    ? collectCssFiles(manifest, layoutCompiledFile)
    : [];
  const layoutScript = manifest[layoutCompiledFile]?.file;

  writeFileSync(join(outdir, 'data', '_empty.json'), '{}');

  for (const pageName in pages) {
    const page = pages[pageName];
    const moduleUrl = pathToFileURL(page.server).href;
    const data = await import(moduleUrl);
    const compiledFile = `.exta/${page.client.replace(/^[^/\\]+[\\/]/, '')}`.replace(
      /\\/g,
      '/',
    );
    const cssFiles = collectCssFiles(manifest, compiledFile);
    const script = manifest[compiledFile].file;

    if (data[PAGE_STATIC_PARAMS_FUNCTION]) {
      const paramsModule = await data[PAGE_STATIC_PARAMS_FUNCTION]();

      if (!Array.isArray(paramsModule)) {
        throw new Error(
          `An error occurred while generating HTML file. - Static params function must return array. (in ${pageName})`,
        );
      }

      for (const params of paramsModule) {
        const route = replaceParamsInRoute(pageName, params);
        const outStaticPage = changeExtension(join(outdir, route), '.html');
        const staticDataPath = changeExtension(
          join(
            outdir,
            'data',
            staticManifest[route.replace(/\//g, '_') + '.json'] || '_empty',
          ),
          '.json',
        );
        const Client = await getClientComponent(page.client);

        mkdirSync(dirname(outStaticPage), { recursive: true });
        writeFileSync(
          outStaticPage,
          serverRendering(
            Client,
            Layout,
            {
              props: JSON.parse(readFileSync(staticDataPath).toString()),
              params: matchUrlToRoute(route, convertToRegex(pageName)),
            },
            template,
            [...cssFiles, ...layoutCss],
            staticManifest,
            route,
            [layoutScript, script],
          ),
        );
      }
    } else {
      if (pageName.startsWith('[') && pageName.endsWith(']')) continue;

      const route = replaceParamsInRoute(pageName, {});
      const outStaticPage = join(outdir, route) + '/index.html';
      const staticDataPath = changeExtension(
        join(
          outdir,
          'data',
          staticManifest[route.replace(/\//g, '_') + '.json'] || '_empty',
        ),
        '.json',
      );
      const Client = await getClientComponent(page.client);

      mkdirSync(dirname(outStaticPage), { recursive: true });

      writeFileSync(
        outStaticPage,
        serverRendering(
          Client,
          Layout,
          {
            props: JSON.parse(readFileSync(staticDataPath).toString()),
            params: {},
          },
          template,
          [...cssFiles, ...layoutCss],
          staticManifest,
          route,
          [layoutScript, script],
        ),
      );
    }
  }

  writeFileSync(
    join(outdir, '404.html'),
    serverRendering(
      ErrorComponent,
      Layout,
      {},
      template,
      [...layoutCss],
      staticManifest,
      '.exta/ssr:unknown',
      [],
    ),
  );
}
