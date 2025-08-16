function normalizePath(path: string): string {
  path = path.replace(/\\/g, '/');

  const parts = path.split('/').filter(Boolean);
  const stack: string[] = [];

  for (const part of parts) {
    if (part === '.') {
      continue;
    }
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }

  return '/' + stack.join('/');
}

export function isSamePathClient(pathA: string, pathB: string): boolean {
  const normalizedA = normalizePath(pathA);
  const normalizedB = normalizePath(pathB);
  return normalizedA.toLowerCase() === normalizedB.toLowerCase();
}

export function removeExtension(path: string) {
  const lastDotIndex = path.lastIndexOf('.');
  if (lastDotIndex === -1) return path;
  return path.slice(0, lastDotIndex);
}
