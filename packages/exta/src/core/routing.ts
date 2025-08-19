import { join, parse, relative } from 'node:path';
import { compilePage } from '~/compiler';
import { CompileOptions } from '~/config/types';
import { scanDirectory } from '~/utils/fs';

interface RouteResult {
  regex: RegExp;
  params: string[];
}

export function convertToRegex(path: string): RouteResult {
  const params: string[] = [];

  let processedPath = path.replace(/\.[^/.]+$/, '');
  if (processedPath.endsWith('/index')) {
    processedPath = processedPath.slice(0, -6);
  }

  const parts = processedPath.split('/').filter((part) => part !== '');

  const regexParts = parts.map((part) => {
    if (part.startsWith('[...') && part.endsWith(']')) {
      const paramName = part.slice(4, -1);
      params.push(paramName);
      return '(.*)';
    }
    if (part.startsWith('[') && part.endsWith(']')) {
      const paramName = part.slice(1, -1);
      params.push(paramName);
      return '([^/]+)';
    }
    return part;
  });

  const regexString = `^/${regexParts.join('/')}$`;
  const regex = new RegExp(regexString);

  return { regex, params };
}

export function prettyURL(path: string): string {
  if (path === '.') {
    path = '';
  }
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  if (path.endsWith('/')) {
    path = path.slice(0, -1);
  }

  return path;
}

export async function compilePages(
  compileOptions?: CompileOptions,
  ignoreAssets: boolean = false,
): Promise<Record<string, { server: string; client: string }>> {
  const baseDir = join(process.cwd(), 'pages');
  const pages = scanDirectory(baseDir);
  const output = {};

  for await (const page of pages) {
    const pageName = parse(page).name;
    let name = prettyURL(relative(baseDir, page).replace(/\\/g, '/'));

    if (pageName === '_layout') {
      name = '[layout]';
    } else if (pageName === '_error') {
      name = '[error]';
    }

    output[name] = (await compilePage(page, compileOptions, ignoreAssets)).outfiles;
  }

  return output;
}
