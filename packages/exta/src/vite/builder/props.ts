import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import {
  PAGE_STATIC_PARAMS_FUNCTION,
  PAGE_STATIC_DATA_FUNCTION,
} from '~/compiler/constants';
import { compilePages } from '~/core/routing';
import { changeExtension } from '~/utils/path';
import { randomString16 } from '~/utils/random';
import { replaceParamsInRoute } from './shared';
import { Spinner } from '~/utils/spinner';

// generate static props executing `getStaticParams` and `getStaticProps`
export async function createStaticProps(
  pages: Awaited<ReturnType<typeof compilePages>>,
  outdir: string,
) {
  const startTime = performance.now();
  const staticManifest = {};

  const spinner = new Spinner();

  spinner.message = 'Generating static data';
  spinner.start();

  for (const pageName in pages) {
    spinner.message = `Generating static data - collecting pages (${pageName})`;

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
        const originalURL = replaceParamsInRoute(pageName, params);
        const outfile = changeExtension(originalURL, '.json').replace(/\//g, '_');
        const random = randomString16();
        const outStaticPage = join(outdir, 'data', `${random}.json`);

        spinner.message = `Generating static data - ${originalURL}`;

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
      const originalURL = replaceParamsInRoute(pageName, {});
      const outfile = changeExtension(originalURL, '.json').replace(/\//g, '_');
      const random = randomString16();
      const outStaticPage = join(outdir, 'data', `${random}.json`);

      spinner.message = `Generating static data - ${originalURL}`;

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

  spinner.stop(
    `Static props generated. (${((performance.now() - startTime) / 1000).toFixed(2)}s)`,
  );

  return staticManifest;
}
