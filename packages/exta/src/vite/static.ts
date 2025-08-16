import { PageManifest } from '$exta-manifest';
import { pathToFileURL } from 'node:url';
import { Plugin } from 'vite';

export function staticDataPlugin(pages: PageManifest[]): Plugin {
  const isDev = process.env.NODE_ENV === 'development';

  const findPage = (url: string) => {
    for (const route of pages) {
      if (route.regexp.test(url)) {
        return route;
      }
    }
    return null;
  };

  return {
    name: 'exta:static-data',

    configureServer(server) {
      if (isDev) {
        server.middlewares.use('/.exta/__page_data', async (req, res) => {
          const url = new URL(req.url, 'http://localhost');
          const page = url.searchParams.get('page') || '/';
          const pageManifest = findPage(page);
          const moduleUrl = pathToFileURL(pageManifest.buildServerPath).href;

          const data = await import(moduleUrl);

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        });
      }
    },
  };
}
