import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join, relative } from 'node:path';

import { Plugin } from 'vite';

import { BaseConfig } from '~/config/types';
import { initialize } from '~/core';
import { compilePages, convertToRegex, prettyURL } from '~/core/routing';
import { matchUrlToRoute } from '~/utils/params';
import { PAGE_STATIC_PARAMS_FUNCTION } from '~/compiler/constants';
import { scanDirectory } from '~/utils/fs';

import type { PageManifest } from '$exta-manifest';
import { extaBuild } from './build';

const manifestModuleId = '$exta-manifest';
const resolvedManifestModuleId = '\0' + manifestModuleId;
const clientModuleId = '$exta-client';
const resolvedClientModuleId = '\0' + clientModuleId;
const routerModuleId = '$exta-router';
const resolvedRouterModuleId = '\0' + routerModuleId;
const pagesModuleId = '$exta-pages';
const resolvedPagesModuleId = '\0' + pagesModuleId;

export function exta(options?: BaseConfig): Plugin[] {
  const isDev = process.env.NODE_ENV === 'development';
  const dist = options?.compileOptions.outdir ?? join(process.cwd(), '.exta');
  const _manifest_object: PageManifest[] = [];
  let _pages: Record<string, { server: string; client: string }>;
  let _manifest: string = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const _server_props = new Map<string, any>();
  let logger: import('vite').Logger;

  if (existsSync(dist)) rmSync(dist, { recursive: true, force: true });

  mkdirSync(dist);

  function generateManifest(rawManif: Awaited<ReturnType<typeof compilePages>>): string {
    if (_manifest) return _manifest;

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

  const findPage = (url: string) => {
    for (const route of _manifest_object) {
      if (route.regexp.test(url)) {
        return route;
      }
    }
    return null;
  };

  return [
    {
      name: 'exta',

      config(config, env) {
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
        if (file.includes('.exta')) {
          return [];
        }

        _pages = await compilePages();
        _server_props.clear();

        if (
          scanDirectory(join(process.cwd(), 'pages'))
            .map((p) => p.replace(/\\/g, '/'))
            .includes(file.replace(/\\/g, '/'))
        ) {
          server.ws.send({ type: 'full-reload' });
        }

        logger.info(
          `${'[exta]'.gray} ${relative(process.cwd(), file).cyan.bold} updated`,
          {},
        );
      },

      async buildStart() {
        _pages = await compilePages();
      },

      async configureServer(server) {
        _pages = await compilePages();

        initialize(options?.compileOptions?.outdir, _pages);

        if (isDev) {
          server.middlewares.use('/.exta/__page_data', async (req, res) => {
            const url = new URL(req.url, 'http://localhost');
            const page = url.searchParams.get('page') || '/';
            const clientURL = new URL(page, 'http://localhost');
            const pageManifest = findPage(page);
            const prettyPathname = prettyURL(clientURL.pathname);

            if (!pageManifest?.buildServerPath)
              return res.end(JSON.stringify({ props: {}, status: 404 }));

            if (_server_props.has(prettyPathname)) {
              return res.end(
                JSON.stringify({
                  props: _server_props.get(prettyPathname),
                  status: 200,
                  cached: true,
                }),
              );
            }

            const moduleUrl = pathToFileURL(pageManifest.buildServerPath).href;
            const serverModule = await import(`${moduleUrl}?v=${Date.now()}`);
            const params = matchUrlToRoute(clientURL.pathname, {
              regex: pageManifest.regexp,
              params: pageManifest.params,
            });

            let data = {};

            res.setHeader('Content-Type', 'application/json');

            if (serverModule[PAGE_STATIC_PARAMS_FUNCTION]) {
              const availableParams = await serverModule[PAGE_STATIC_PARAMS_FUNCTION]({
                url,
                params,
              });

              let success = 0;

              for (let param in params) {
                param = param.trim();
                if (!availableParams[param].includes(params[param])) {
                  success += 1;
                }
              }

              if (success !== 0) {
                return res.end(
                  JSON.stringify({
                    props: {},
                    status: 404,
                  }),
                );
              }
            }

            if (serverModule.getStaticProps) {
              data = await serverModule.getStaticProps({ url: clientURL, params });
            }

            _server_props.set(prettyPathname, data);

            res.end(JSON.stringify({ props: data, status: 200 }));
          });
        }
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
    extaBuild(),
  ];
}
