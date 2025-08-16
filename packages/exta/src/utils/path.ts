import { join, normalize, parse, resolve } from 'node:path';

/** changeExtension("/a/b/c.ts", ".tsx") */
export function changeExtension(filename: string, to: string) {
  const { dir, name } = parse(filename);

  return join(dir, name + to).replace(/\\/g, '/');
}

export function isSamePath(pathA: string, pathB: string): boolean {
  const normalizedA = normalize(resolve(pathA));
  const normalizedB = normalize(resolve(pathB));

  if (process.platform === 'win32') {
    return normalizedA.toLowerCase() === normalizedB.toLowerCase();
  }
  return normalizedA === normalizedB;
}
