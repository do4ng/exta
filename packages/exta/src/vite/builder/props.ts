import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  PAGE_STATIC_PARAMS_FUNCTION,
  PAGE_STATIC_DATA_FUNCTION,
} from '~/compiler/constants';
import { compilePages } from '~/core/routing';
import { changeExtension } from '~/utils/path';
import { randomString16 } from '~/utils/random';
import { replaceParamsInRoute } from './shared';

// generate static props executing `getStaticParams` and `getStaticProps`
export async function createStaticProps(
  pages: Awaited<ReturnType<typeof compilePages>>,
  outdir: string,
) {
  const staticManifest = {};

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
        const outfile = changeExtension(
          replaceParamsInRoute(pageName, params),
          '.json',
        ).replace(/\//g, '_');
        const random = randomString16();
        const outStaticPage = join(outdir, 'data', `${random}.json`);

        mkdirSync(dirname(outStaticPage), { recursive: true });

        staticManifest[outfile] = random;

        if (data[PAGE_STATIC_DATA_FUNCTION]) {
          const staticProps = await data[PAGE_STATIC_DATA_FUNCTION]({ params });

          writeFileSync(outStaticPage, JSON.stringify(staticProps));
        } else {
          staticManifest[outfile] = null;
        }
      }
    } else {
      const outfile = changeExtension(
        replaceParamsInRoute(pageName, {}),
        '.json',
      ).replace(/\//g, '_');
      const random = randomString16();
      const outStaticPage = join(outdir, 'data', `${random}.json`);

      staticManifest[outfile] = random;

      mkdirSync(dirname(outStaticPage), { recursive: true });

      if (data[PAGE_STATIC_DATA_FUNCTION]) {
        const staticProps = await data[PAGE_STATIC_DATA_FUNCTION]();

        writeFileSync(outStaticPage, JSON.stringify(staticProps));
      } else {
        staticManifest[outfile] = null;
      }
    }
  }

  return staticManifest;
}
