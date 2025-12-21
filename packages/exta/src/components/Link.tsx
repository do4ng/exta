import React from 'react';

type AnchorBaseProps = Omit<React.ComponentPropsWithoutRef<'a'>, 'href' | 'onClick'> & {
  href: string;

  /**
   * Download the data for that page in advance.
   */
  prefetch?: boolean;
  /**
   * Load page data from the SSR stage.
   */
  preload?: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void | Promise<void>;
};

function isExternal(url: string): boolean {
  try {
    const target = new URL(url, window.location.href);
    return target.origin !== window.location.origin;
  } catch {
    return false;
  }
}

export function Link({ href, onClick, prefetch, preload, ...props }: AnchorBaseProps) {
  if (typeof window === 'undefined') {
    if (preload) {
      global.__EXTA_SSR_DATA__.head.push({ type: 'preload-data-link', data: href });
    }
    return (
      <a {...props} href={href}>
        {props.children}
      </a>
    );
  }

  const useRouter = window._exta_useRouter;
  const extaRouter = window._exta_router;
  const router = useRouter();

  if (!isExternal(href) && prefetch !== false) {
    const url = new URL(href, window.location.origin);
    extaRouter.prefetch(url.pathname);
  }

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented) return;

    // modifier / new tab
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || props.target === '_blank') {
      return;
    }

    const current = window.location;
    const target = new URL(href, current.href);

    const isHashOnly = href.startsWith('#');
    const isSamePath = target.pathname === current.pathname;
    const isHashChange = target.hash && target.hash !== current.hash;

    // hash change
    if (isHashOnly || (isSamePath && isHashChange)) {
      return;
    }

    if (onClick) {
      await onClick(e);
      if (e.defaultPrevented) return;
    }

    if (isExternal(href)) {
      window.location.href = href;
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    await extaRouter.goto(target.pathname);
    router.push(target.pathname + target.search + target.hash);
  };

  return (
    <a {...props} href={href} onClick={handleClick}>
      {props.children}
    </a>
  );
}
