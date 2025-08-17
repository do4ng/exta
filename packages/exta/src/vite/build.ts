import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, parse, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

import { Plugin, ResolvedConfig } from 'vite';
import {
  PAGE_STATIC_DATA_FUNCTION,
  PAGE_STATIC_PARAMS_FUNCTION,
} from '~/compiler/constants';

import { BaseConfig } from '~/config/types';
import { initialize } from '~/core';
import { compilePages } from '~/core/routing';
import { scanDirectory } from '~/utils/fs';
import { changeExtension } from '~/utils/path';

function replaceParamsInRoute(route: string, params: { [key: string]: string }): string {
  let result = route;

  const regex = /\[([^\]]+)\]/g;
  let match;

  while ((match = regex.exec(result)) !== null) {
    const paramName = match[1];
    const value = params[paramName];

    if (value) {
      result = result.replace(match[0], value);
    }
  }
  result = result.replace(/\.[^/.]+$/, '');

  result = result.replace(/\/index$/, '') || '/';

  return result;
}

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
          const staticProps = await data[PAGE_STATIC_DATA_FUNCTION]();

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

export function extaBuild(options?: BaseConfig): Plugin {
  let viteConfig: ResolvedConfig;

  const baseDir = join(process.cwd(), 'pages');
  const pagesPath = scanDirectory(baseDir);
  const pageMap = {};

  let pages;

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
    },

    configResolved(config) {
      viteConfig = config;
    },

    async buildStart() {
      pages = await compilePages({ outdir: viteConfig.build.outDir });
      initialize(viteConfig.build.outDir, pages);
    },

    async generateBundle(options, bundle) {
      pages = await compilePages({ outdir: viteConfig.build.outDir });
      initialize(viteConfig.build.outDir || 'dist', pages);

      await createStaticProps(pages, viteConfig.build.outDir);

      writeFileSync(
        join(viteConfig.build.outDir, 'map.json'),
        JSON.stringify(generatePageMap(bundle)),
      );

      const { outDir } = viteConfig.build;
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
