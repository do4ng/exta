import { ReactElement, useEffect, cloneElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

export function Head({ children }: { children: ReactElement | ReactElement[] }) {
  const isServer = typeof window === 'undefined';

  if (isServer) {
    if (global.__EXTA_SSR_DATA__) {
      const wrapped = Array.isArray(children)
        ? children.map((c, i) =>
            cloneElement(c, { ...({ 'data-ssr-head': '', key: i } as any) }),
          )
        : cloneElement(children as React.ReactElement<any>, {
            ...({ 'data-ssr-head': '' } as any),
          });

      global.__EXTA_SSR_DATA__.head.push({
        type: 'html',
        data: renderToStaticMarkup(wrapped).replace(/data-ssr-head=""/g, 'data-ssr-head'),
      });
    }
    return null;
  }

  useEffect(() => {
    document.head
      .querySelectorAll('[data-ssr-head]')
      .forEach((el) => el.parentNode?.removeChild(el));

    console.log();

    const html = renderToStaticMarkup(children);
    const template = document.createElement('template');
    template.innerHTML = html;
    const nodes = Array.from(template.content.childNodes);

    nodes.forEach((node) => document.head.appendChild(node));

    return () => {
      nodes.forEach((node) => {
        if (document.head.contains(node)) {
          document.head.removeChild(node);
        }
      });
    };
  }, [children]);

  return null;
}
