import { readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import { build } from 'esbuild';

import { CompileOptions } from '~/config/types';

import { PAGE_STATIC_DATA_FUNCTION, PAGE_STATIC_PARAMS_FUNCTION } from './constants';
import { generateOriginalServerFile, getExports } from './utils';
import { onlyReact, sideEffectPlugin } from './plugin';
import { changeExtension } from '~/utils/path';

export async function compilePage(
  filename: string,
  options: CompileOptions = {},
  ignoreAssets: boolean,
) {
  const cwd = process.cwd();
  const source = await readFile(filename, 'utf-8');
  const exports = await getExports(source, filename);

  const hasStaticPropsFunction = exports.includes(PAGE_STATIC_DATA_FUNCTION);
  const hasStaticParamsFunction = exports.includes(PAGE_STATIC_PARAMS_FUNCTION);

  const intermeddiateFiles = await generateOriginalServerFile(filename, {
    data: hasStaticPropsFunction,
    params: hasStaticParamsFunction,
    default: exports.includes('__default'),
  });

  const basePageDirectory = join(cwd, 'pages');
  const relativeFilename = relative(basePageDirectory, filename);
  const outdirectory = options.outdir ?? join(cwd, '.exta');

  const outfiles = {
    client: join(outdirectory, 'client', changeExtension(relativeFilename, '.js')),
    server: join(outdirectory, 'server', changeExtension(relativeFilename, '.mjs')),
  };

  // compile client file to javascript
  await build({
    entryPoints: [intermeddiateFiles.outClientFile],
    outfile: outfiles.client,
    packages: 'external',
    sourcemap: 'inline',
    format: 'esm',
    platform: 'browser',
    treeShaking: true,
    bundle: true,
    jsx: 'automatic',
    ignoreAnnotations: true,

    plugins: [sideEffectPlugin(), onlyReact(undefined, ignoreAssets)],
  });

  // compile server file to javascript
  await build({
    entryPoints: [intermeddiateFiles.outServerFile],
    outfile: outfiles.server,
    packages: 'external',
    format: 'esm',
    platform: 'node',
    treeShaking: true,
    bundle: true,
    ignoreAnnotations: true,

    plugins: [sideEffectPlugin(), onlyReact(undefined, true)],
  });

  return { outfiles };
}
