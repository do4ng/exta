interface RouteResult {
  regex: RegExp;
  params: string[];
}

export function matchUrlToRoute(
  url: string,
  routeResult: RouteResult,
): { [key: string]: string } | null {
  const { regex, params } = routeResult;
  const match = regex.exec(url);

  if (!match) {
    return null;
  }

  const result: { [key: string]: string } = {};

  for (let i = 0; i < params.length; i++) {
    const paramName = params[i];
    const capturedValue = match[i + 1];

    if (paramName.startsWith('...')) {
      throw new Error(
        '[... file names are not supported due to static data generation issues.',
      );
    } else {
      result[paramName] = capturedValue;
    }
  }

  return result;
}
