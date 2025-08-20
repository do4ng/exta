import React from 'react';

type AnchorBaseProps = Omit<React.ComponentPropsWithoutRef<'a'>, 'href' | 'onClick'> & {
  href: string;
  prefetch?: boolean;
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

function prettyURL(path: string): string {
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

export function Link({ href, onClick, prefetch, ...props }: AnchorBaseProps) {
  if (typeof window === 'undefined') {
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
    const url = new URL(href, window.location.origin).pathname;
    extaRouter.prefetch(url);
  }

  const handleClick = async (e) => {
    e.preventDefault();

    // user onClick
    if (onClick) await onClick(e);

    if (isExternal(href)) {
      return (window.location.href = href);
    }

    await extaRouter.goto(href);
    router.push(href);
  };

  return (
    <a {...props} href={href} onClick={handleClick}>
      {props.children}
    </a>
  );
}
