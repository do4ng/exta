import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { join, relative } from 'node:path';

import { ConfigEnv, Plugin } from 'vite';

import type { PageManifest } from '$exta-manifest';

import { BaseConfig } from '~/config/types';
import { initialize } from '~/core';
import { compilePages, prettyURL } from '~/core/routing';
import { matchUrlToRoute } from '~/utils/params';
import {
  PAGE_STATIC_DATA_FUNCTION,
  PAGE_STATIC_PARAMS_FUNCTION,
} from '~/compiler/constants';
import { scanDirectory } from '~/utils/fs';
import { encodeJSON } from '~/utils/url';
import { convertToRegex } from '~/utils/urlPath';
import { findPage as findPageDev } from '~/utils/find';

import { extaBuild } from './build';
import { ServerModule } from './type';
import { changeExtension } from '~/utils/path';
import { debug } from '~/logger';

const manifestModuleId = '$exta-manifest';
const resolvedManifestModuleId = '\0' + manifestModuleId;
const clientModuleId = '$exta-client';
const resolvedClientModuleId = '\0' + clientModuleId;
const routerModuleId = '$exta-router';
const resolvedRouterModuleId = '\0' + routerModuleId;

export function exta(options?: BaseConfig): Plugin[] {
  const isDev = process.env.NODE_ENV === 'development';
  const dist = options?.compileOptions.outdir ?? join(process.cwd(), '.exta');
  const _manifest_object: PageManifest[] = [];
  const _server_props = new Map<string, any>();

  let _pages: Record<string, { server: string; client: string }>;
  let _manifest: string = null;
  let logger: import('vite').Logger;
  let env: ConfigEnv;

  if (existsSync(dist)) rmSync(dist, { recursive: true, force: true });

  mkdirSync(dist);

  function generateManifest(
    rawManif: Awaited<ReturnType<typeof compilePages>>,
    force: boolean = false,
  ): string {
    if (_manifest && !force) return _manifest;

    const manifest: string[] = [];

    for (const path in rawManif) {
      const converted = convertToRegex(path);
      const relativePath = relative(
        join(process.cwd(), '.exta'),
        rawManif[path].client,
      ).replace(/\\/g, '/');
      const code = `{path: ${JSON.stringify(path)}, regexp: ${converted.regex.toString()}, params: ${JSON.stringify(converted.params)}, buildPath: ${JSON.stringify(relativePath)}, originalPath: ${JSON.stringify(path)}}`;

      manifest.push(code);
      _manifest_object.push({
        path,
        originalPath: path,
        regexp: converted.regex,
        params: converted.params,
        buildPath: relativePath,
        buildServerPath: rawManif[path].server,
      });
    }

    _manifest = `export const PAGES_MANIFEST = [\n  ${manifest.join(',\n  ')}\n]`;

    return _manifest;
  }

  const findPage = (url: string) => findPageDev(url, _manifest_object);

  return [
    {
      name: 'exta',

      config(config, _env) {
        env = _env;

        config.server ??= {};
        config.server.watch ??= {};
        config.server.watch.ignored = [
          '/.exta/**',
          ...(Array.isArray(config.server.watch.ignored)
            ? config.server.watch.ignored
            : config.server.watch.ignored
              ? [config.server.watch.ignored]
              : []),
        ];

        config.resolve ??= {};
        config.resolve.alias ??= {};
        config.resolve.alias['$exta-pages'] = join(
          env.command === 'serve' ? dist : config.build.outDir || 'dist',
          'manifest.js',
        );
      },

      configResolved(config) {
        logger = config.logger;
      },

      async handleHotUpdate({ server, file }) {
        if (file.includes('.exta')) return []; // skip .exta

        const dist = options?.compileOptions?.outdir || join(process.cwd(), '.exta');

        _pages = await compilePages(options?.compileOptions);
        _server_props.clear();

        const beforeManifest = `${_manifest}`;
        const afterManifest = generateManifest(_pages, true);

        // when page structure changed
        if (beforeManifest !== afterManifest) {
          server.ws.send({ type: 'full-reload' });
          return [];
        }

        writeFileSync(
          join(dist, 'manifest.js'),
          `export default {${Object.keys(_pages)
            .map(
              (page) =>
                `  "${page}": () => import("./${relative(dist, _pages[page].client).replace(/\\/g, '/')}"),\n`,
            )
            .join('\n')}}`,
        );

        // helper: invalidate module + trigger HMR
        const invalidateAndUpdate = (modid: any, isVirtual = true) => {
          if (!modid) return;

          const mod = server.moduleGraph.getModuleById(modid);

          if (!mod) return;

          server.moduleGraph.invalidateModule(mod);

          server.ws.send({
            type: 'update',
            updates: [
              {
                type: 'js-update',
                path: isVirtual ? '/@id/' + mod.id : mod.url,
                acceptedPath: isVirtual ? '/@id/' + mod.id : mod.url,
                timestamp: Date.now(),
              },
            ],
          });
        };

        // update virtual modules
        invalidateAndUpdate(resolvedManifestModuleId);
        invalidateAndUpdate(
          (await server.moduleGraph.getModuleByUrl('$exta-pages'))?.id ?? null,
        );

        // HMR for pages tsx
        const normalizedFile = file.replace(/\\/g, '/');
        const pagesDirectory = join(process.cwd(), 'pages');
        const pagesFiles = scanDirectory(pagesDirectory).map((p) =>
          p.replace(/\\/g, '/'),
        );
        const compiledFile = changeExtension(
          join(
            process.cwd(),
            '.exta',
            'client',
            relative(pagesDirectory, normalizedFile),
          ),
          '.js',
        ).replace(/\\/g, '/');

        if (pagesFiles.includes(normalizedFile)) {
          const modules = Array.from(server.moduleGraph.urlToModuleMap.values()).filter(
            (mod) => {
              return mod.file && mod.file.replace(/\\/g, '/') === compiledFile;
            },
          );

          for (const mod of modules) {
            invalidateAndUpdate(mod.id, false); // HMR update
          }
        }

        logger.info(
          `${'[exta]'.gray} ${relative(process.cwd(), file).cyan.bold} updated`,
          {},
        );
      },

      async buildStart() {
        _pages = await compilePages(options?.compileOptions);
      },

      async configureServer(server) {
        _pages = await compilePages(options?.compileOptions);

        initialize(options?.compileOptions?.outdir, _pages);

        if (isDev) {
          server.middlewares.use('/.exta/__page_data', async (req, res) => {
            const url = new URL(req.url, 'http://localhost'); // request url
            const page = url.searchParams.get('page') || '/';

            debug(`Requested "${page}"`);

            if (page === '$IS_CONNECTED$') {
              return res.end(JSON.stringify({ connected: true }));
            }

            const clientURL = new URL(page, 'http://localhost'); // page url

            const pageManifest = findPage(page);
            const prettyPathname = prettyURL(decodeURIComponent(clientURL.pathname));

            res.setHeader('Content-Type', 'application/json');

            // cannot find server module
            if (!pageManifest?.buildServerPath)
              return res.end(JSON.stringify({ props: {}, status: 404 }));

            // cache static props
            if (_server_props.has(prettyPathname)) {
              return res.end(
                JSON.stringify({
                  props: _server_props.get(prettyPathname),
                  status: 200,
                  cached: true,
                }),
              );
            }

            try {
              // load client page module
              const moduleUrl = pathToFileURL(pageManifest.buildServerPath).href;
              const serverModule: ServerModule = await import(
                `${moduleUrl}?v=${Date.now()}`
              );

              // generate params with pathname
              const params = matchUrlToRoute(clientURL.pathname, {
                regex: pageManifest.regexp,
                params: pageManifest.params,
              });

              let data = {};

              // check is valid path (comparing params)
              if (serverModule[PAGE_STATIC_PARAMS_FUNCTION]) {
                const availableParams = await serverModule[PAGE_STATIC_PARAMS_FUNCTION]();

                let success = false;

                for (const allowedParams of availableParams) {
                  if (isDeepStrictEqual(encodeJSON(allowedParams), params)) {
                    success = true;
                  }
                }

                if (!success) {
                  return res.end(
                    JSON.stringify({
                      props: {},
                      status: 404,
                    }),
                  );
                }
              }

              // execute getStaticProps
              if (serverModule[PAGE_STATIC_DATA_FUNCTION]) {
                data = await serverModule[PAGE_STATIC_DATA_FUNCTION]({
                  params,
                });
              }
              _server_props.set(prettyPathname, data);
              res.end(JSON.stringify({ props: data, status: 200 }));
              debug(`Request ended "${page}"`);
            } catch (e) {
              console.error(e);
              res.end(
                JSON.stringify({
                  message: 'Internal Server Error',
                  detail: e.message,
                  status: 500,
                }),
              );
            }
          });
        }
      },

      transformIndexHtml(html) {
        return html.replace('%body%', '<div id="_app"></div>');
      },

      resolveId(id) {
        if (id === manifestModuleId) {
          return resolvedManifestModuleId;
        } else if (id === clientModuleId) {
          return resolvedClientModuleId;
        } else if (id === routerModuleId) {
          return resolvedRouterModuleId;
        }
      },

      load(id) {
        if (id === resolvedClientModuleId) {
          return {
            code: readFileSync(join(__dirname, 'client.mjs'), 'utf-8'),
          };
        } else if (id === resolvedManifestModuleId) {
          return {
            code: generateManifest(_pages),
          };
        } else if (id === resolvedRouterModuleId) {
          return {
            code: readFileSync(join(__dirname, 'router.mjs'), 'utf-8'),
          };
        }
      },
    },
    extaBuild(options?.compileOptions || {}),
  ];
}
