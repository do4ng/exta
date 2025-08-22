import { ReactElement, useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

export function Head({ children }: { children: ReactElement | ReactElement[] }) {
  if (typeof window === 'undefined') {
    global.__EXTA_SSR_DATA__.head.push(renderToStaticMarkup(children));

    return null;
  }

  useEffect(() => {
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
