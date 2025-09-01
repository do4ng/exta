import { RouteResult } from '$exta-router';

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

  const regexString = `^/${regexParts.join('/')}/?$`;
  const regex = new RegExp(regexString);

  return { regex, params };
}
