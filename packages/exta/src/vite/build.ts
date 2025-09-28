import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, parse, relative } from 'node:path';

import { createServer, Manifest, Plugin, ResolvedConfig, ViteDevServer } from 'vite';

import { initialize } from '~/core';
import { compilePages } from '~/core/routing';
import { changeExtension } from '~/utils/path';
import { CompileOptions } from '~/config/types';

import { createStaticHTML } from './builder/ssr';
import { createStaticProps } from './builder/props';

export function extaBuild(compilerOptions: CompileOptions = {}): Plugin {
  let viteConfig: ResolvedConfig;

  const pageMap = {};

  let pages;
  let vite: ViteDevServer;
  let staticManifest: Record<string, string | null>;

  function generatePageMap(
    bundle: import('rollup').OutputBundle,
  ): Record<string, string> {
    if (Object.keys(pageMap).length !== 0) return pageMap;

    for (const key in bundle) {
      if (bundle[key].type === 'asset') continue;
      if (!bundle[key].isDynamicEntry && !bundle[key].exports.includes('__exta_page'))
        continue;

      let setKey = relative(
        join('.exta', 'client').replace(/\\/g, '/'),
        bundle[key].facadeModuleId,
      );

      const pageName = parse(setKey).name;

      if (pageName === '_layout') setKey = '[layout]';
      if (pageName === '_error') setKey = '[error]';

      pageMap[setKey] = key;
    }

    return pageMap;
  }

  return {
    name: 'exta:build',
    apply: 'build',

    async config(config) {
      initialize(config.build.outDir || 'dist', {});
      pages = await compilePages({
        ...compilerOptions,
        outdir: config.build.outDir || 'dist',
      });

      config.build ??= {};
      config.build.rollupOptions ??= {};
      config.build.rollupOptions.input ??= {};

      config.build.manifest = true;
      config.build.rollupOptions.input['index.html'] = 'index.html';

      vite = await createServer({
        server: { middlewareMode: true, hmr: false },
        ...config,
      });
    },

    async configResolved(config) {
      viteConfig = config;
    },

    async buildStart() {},

    async generateBundle(options, bundle) {
      pages = await compilePages({ ...compilerOptions, outdir: viteConfig.build.outDir });
      initialize(viteConfig.build.outDir, pages);

      console.log();
      console.log();

      staticManifest = await createStaticProps(pages, viteConfig.build.outDir);
      console.log();

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

      console.log();
      await createStaticHTML(
        pages,
        viteConfig.build.outDir,
        vite,
        indexHTML,
        manifest,
        staticManifest,
      );

      await vite.close();

      rmSync(join(outDir, 'map.json'), { recursive: true, force: true });
      rmSync(join(outDir, 'manifest.js'), { recursive: true, force: true });
      rmSync(join(outDir, 'client.js'), { recursive: true, force: true });
      rmSync(join(outDir, 'server'), { recursive: true, force: true });
      rmSync(join(outDir, 'client'), { recursive: true, force: true });

      // build summary
      // run : BUILD_SUMMARY=true vite build
      if (process.env.BUILD_SUMMARY) {
        const buildSummary = [];

        buildSummary.push('Build Summary');

        for (const staticFile in staticManifest) {
          const filename = changeExtension(staticFile.replace(/_/g, '/'), '');

          if (!staticManifest[staticFile]) {
            buildSummary.push(`${filename}`);
            continue;
          }
          buildSummary.push(
            `${filename.padEnd(60)}${`${staticManifest[staticFile] || 'null'}.json`}`,
          );
        }

        writeFileSync(join(__dirname, '../summary.txt'), buildSummary.join('\n'));
        console.log(
          `\nCheck the ${join(__dirname, '../summary.txt')} file to view the build summary.`,
        );
      }
      console.log();
    },

    transformIndexHtml(html) {
      return {
        html,
        tags: [
          {
            tag: 'script',
            injectTo: 'head',
            attrs: { id: '__PAGE_MAP__', type: 'text/javascript' },
            children: `window.__EXTA_PAGEMAP__ = ${JSON.stringify(pageMap)}`,
          },
        ],
      };
    },
  };
}
