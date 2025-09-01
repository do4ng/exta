import { PageManifest } from '$exta-manifest';

export const findPage = (
  url: string,
  _manifest_object: PageManifest[],
): PageManifest | null => {
  // Sort by len of params
  const sortedManifest = [..._manifest_object].sort(
    (a, b) => a.params.length - b.params.length,
  );

  for (const route of sortedManifest) {
    /*
    console.log(
      `${url} === ${route.path} => ${route.regexp.test(decodeURIComponent(url))}`,
    );
    */
    if (
      route.regexp.test(decodeURIComponent(url)) &&
      !route.path.startsWith('[') &&
      !route.path.endsWith(']')
    ) {
      return route;
    }
  }

  return null;
};
