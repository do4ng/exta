/* eslint-disable @typescript-eslint/no-explicit-any */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, parse, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

import { createServer, Manifest, Plugin, ResolvedConfig, ViteDevServer } from 'vite';
import { renderToString } from 'react-dom/server';
import React from 'react';

import { DefaultError } from '~/client/components/_error';
import { DefaultLayout } from '~/client/components/_layout.';
import {
  PAGE_STATIC_DATA_FUNCTION,
  PAGE_STATIC_PARAMS_FUNCTION,
} from '~/compiler/constants';
import { initialize } from '~/core';
import { compilePages, convertToRegex } from '~/core/routing';
import { scanDirectory } from '~/utils/fs';
import { changeExtension } from '~/utils/path';
import { matchUrlToRoute } from '~/utils/params';
import { CompileOptions } from '~/config/types';

export function replaceParamsInRoute(
  route: string,
  params: { [key: string]: string },
): string {
  let result = route;

  const paramRegex = /\[([^\]]+)\]/g;

  result = result.replace(paramRegex, (match, paramName) => {
    const value = params[paramName];
    return value || match;
  });
  result = result.replace(/\.[^/.]+$/, '');

  result = result.replace(/\/index$/, '') || '/';

  return result;
}

function collectCssFiles(manifest: Manifest, entry: string): string[] {
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

export const serverRendering = (
  children: any,
  Layout: any,
  props: object,
  template: string,
  cssFiles: string[],
) => {
  const string = renderToString(
    React.createElement(Layout, null, React.createElement(children, props)),
  );

  const insert = [];

  for (const cssChunk of cssFiles) {
    insert.push(`<link rel="stylesheet" href="/${cssChunk}" />`);
  }

  template = template.replace(/<head[^>]*>([\s\S]*?)<\/head>/, (match, inner) => {
    return `<head${match.match(/<head([^>]*)>/)?.[1] || ''}>${insert.join('')}\n${inner}</head>`;
  });

  return template.replace('<div id="_app"></div>', `<div id="_app">${string}</div>`);
};

async function createStaticProps(
  pages: Awaited<ReturnType<typeof compilePages>>,
  outdir: string,
) {
  for (const pageName in pages) {
    const page = pages[pageName];
    const moduleUrl = pathToFileURL(page.server).href;
    const data = await import(moduleUrl);

    if (data[PAGE_STATIC_PARAMS_FUNCTION]) {
      const paramsModule = await data[PAGE_STATIC_PARAMS_FUNCTION]();

      if (!Array.isArray(paramsModule)) {
        throw new Error(
          `An error occurred while building the page. - Static params function must return array. (in ${pageName})`,
        );
      }

      for (const params of paramsModule) {
        const outStaticPage = changeExtension(
          join(
            outdir,
            'data',
            replaceParamsInRoute(pageName, params).replace(/\//g, '_'),
          ),
          '.json',
        );

        mkdirSync(dirname(outStaticPage), { recursive: true });

        if (data[PAGE_STATIC_DATA_FUNCTION]) {
          const staticProps = await data[PAGE_STATIC_DATA_FUNCTION]({ params });

          writeFileSync(outStaticPage, JSON.stringify(staticProps));
        } else {
          writeFileSync(outStaticPage, JSON.stringify({}));
        }
      }
    } else {
      const outStaticPage = changeExtension(
        join(outdir, 'data', replaceParamsInRoute(pageName, {}).replace(/\//g, '_')),
        '.json',
      );
      mkdirSync(dirname(outStaticPage), { recursive: true });

      if (data[PAGE_STATIC_DATA_FUNCTION]) {
        const staticProps = await data[PAGE_STATIC_DATA_FUNCTION]();

        writeFileSync(outStaticPage, JSON.stringify(staticProps));
      } else {
        writeFileSync(outStaticPage, JSON.stringify({}));
      }
    }
  }
}

export async function createStaticHTML(
  pages: Awaited<ReturnType<typeof compilePages>>,
  outdir: string,
  vite: ViteDevServer,
  template: string,
  manifest: Manifest,
) {
  const getLayout = async (params?: any, path?: string): Promise<any> => {
    if (!pages['[layout]']) return DefaultLayout;

    global.__EXTA_SSR_DATA__ = {
      pathname: path,
      params,
    };

    return (await vite.ssrLoadModule(pages['[layout]'].client))._page;
  };

  const getError = async (): Promise<any> => {
    if (!pages['[error]']) return DefaultError;

    global.__EXTA_SSR_DATA__ = {
      pathname: null,
      params: null,
    };

    return (await vite.ssrLoadModule(pages['[error]'].client))._page;
  };

  const getClientComponent = async (
    path: string,
    url: string,
    params?: any,
  ): Promise<any> => {
    global.__EXTA_SSR_DATA__ = {
      pathname: url,
      params,
    };

    return (await vite.ssrLoadModule(path))._page;
  };

  const ErrorComponent = await getError();

  const layoutCss = pages['[layout]']
    ? collectCssFiles(manifest, pages['[layout]'].client.replace(/\\/g, '/'))
    : [];

  for (const pageName in pages) {
    const page = pages[pageName];
    const moduleUrl = pathToFileURL(page.server).href;
    const data = await import(moduleUrl);
    const cssFiles = collectCssFiles(manifest, page.client.replace(/\\/g, '/'));

    console.log(cssFiles, page.client.replace(/\\/g, '/'));

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
          join(outdir, 'data', route.replace(/\//g, '_')),
          '.json',
        );
        const Layout = await getLayout(params, route);

        mkdirSync(dirname(outStaticPage), { recursive: true });
        writeFileSync(
          outStaticPage,
          serverRendering(
            await getClientComponent(page.client, route, params),
            Layout,
            {
              props: JSON.parse(readFileSync(staticDataPath).toString()),
              params: matchUrlToRoute(route, convertToRegex(pageName)),
            },
            template,
            [...cssFiles, ...layoutCss],
          ),
        );
      }
    } else {
      if (pageName.startsWith('[') && pageName.endsWith(']')) continue;

      const route = replaceParamsInRoute(pageName, {});
      const outStaticPage = join(outdir, route) + '/index.html';
      const staticDataPath = changeExtension(
        join(outdir, 'data', route.replace(/\//g, '_')),
        '.json',
      );
      const Layout = await getLayout({}, route);

      mkdirSync(dirname(outStaticPage), { recursive: true });

      writeFileSync(
        outStaticPage,
        serverRendering(
          await getClientComponent(page.client, route, {}),
          Layout,
          {
            props: JSON.parse(readFileSync(staticDataPath).toString()),
            params: {},
          },
          template,
          [...cssFiles, ...layoutCss],
        ),
      );
    }
  }

  const Layout = await getLayout({});

  writeFileSync(
    join(outdir, '404.html'),
    serverRendering(ErrorComponent, Layout, {}, template, [...layoutCss]),
  );
}

export function extaBuild(compilerOptions: CompileOptions = {}): Plugin {
  let viteConfig: ResolvedConfig;

  const baseDir = join(process.cwd(), 'pages');
  const pagesPath = scanDirectory(baseDir);
  const pageMap = {};

  let pages;
  let vite: ViteDevServer;

  function generatePageMap(
    bundle: import('rollup').OutputBundle,
  ): Record<string, string> {
    if (Object.keys(pageMap).length !== 0) return pageMap;

    for (const key in bundle) {
      if (bundle[key].type === 'asset') continue;
      if (!bundle[key].isEntry) continue;

      let setKey = relative(
        join(viteConfig.build.outDir, 'client').replace(/\\/g, '/'),
        bundle[key].facadeModuleId,
      );
      const pageName = parse(setKey).name;

      if (pageName === '_layout') setKey = '[layout]';
      if (pageName === '_error') setKey = '[error]';

      pageMap[setKey] = key;
    }

    return pageMap;
  }

  initialize(undefined, {});

  return {
    name: 'exta:build',
    apply: 'build',

    async config(config) {
      config.build ??= {};
      config.build.rollupOptions ??= {};

      config.build.manifest = true;

      const inputs = config.build.rollupOptions.input || {};

      for (const pagePath of pagesPath) {
        const relativePath = relative(baseDir, pagePath);
        const name = relativePath;
        inputs[name] = changeExtension(
          join(config.build.outDir || 'dist', 'client', relativePath),
          '.js',
        );
      }

      inputs['index.html'] = 'index.html';

      config.build.rollupOptions.input = inputs;

      vite = await createServer({
        server: { middlewareMode: true, hmr: false },
        ...config,
      });
    },

    async configResolved(config) {
      viteConfig = config;
    },

    async buildStart() {
      pages = await compilePages({ ...compilerOptions, outdir: viteConfig.build.outDir });
      initialize(viteConfig.build.outDir, pages);
    },

    async generateBundle(options, bundle) {
      pages = await compilePages({ ...compilerOptions, outdir: viteConfig.build.outDir });
      initialize(viteConfig.build.outDir || 'dist', pages);

      await createStaticProps(pages, viteConfig.build.outDir);

      writeFileSync(
        join(viteConfig.build.outDir, 'map.json'),
        JSON.stringify(generatePageMap(bundle)),
      );
    },

    async writeBundle() {
      const { outDir } = viteConfig.build;
      const indexHTML = readFileSync(join(outDir, 'index.html')).toString();

      pages = await compilePages(
        { ...compilerOptions, outdir: viteConfig.build.outDir },
        true,
      );

      const manifestPath = join(outDir, '.vite/manifest.json');
      const manifest: Manifest = JSON.parse(readFileSync(manifestPath).toString());

      await createStaticHTML(pages, viteConfig.build.outDir, vite, indexHTML, manifest);

      await vite.close();

      rmSync(join(outDir, 'map.json'), { recursive: true, force: true });
      rmSync(join(outDir, 'manifest.js'), { recursive: true, force: true });
      rmSync(join(outDir, 'client.js'), { recursive: true, force: true });
      rmSync(join(outDir, 'server'), { recursive: true, force: true });
      rmSync(join(outDir, 'client'), { recursive: true, force: true });
    },

    transformIndexHtml(html) {
      return {
        html,
        tags: [
          {
            tag: 'script',
            injectTo: 'head',
            attrs: { id: '_e_pagemap_', type: 'text/javascript' },
            children: `window.__EXTA_PAGEMAP__ = ${JSON.stringify(pageMap)}`,
          },
        ],
      };
    },
  };
}
