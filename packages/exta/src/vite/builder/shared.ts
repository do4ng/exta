export function replaceParamsInRoute(
  route: string,
  params: { [key: string]: string },
): string {
  let result = route;

  const paramRegex = /\[([^\]]+)\]/g;

  result = result.replace(paramRegex, (match, paramName) => {
    const value = params[paramName];
    return value || match;
  });
  result = result.replace(/\.[^/.]+$/, '');

  result = result.replace(/\/index$/, '') || '/';

  return result;
}
