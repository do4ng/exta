import React from 'react';

type AnchorBaseProps = Omit<React.ComponentPropsWithoutRef<'a'>, 'href' | 'onClick'> & {
  href: string;
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

export function Link({ href, onClick, ...props }: AnchorBaseProps) {
  if (typeof window === 'undefined') {
    return <a href={href}>{props.children}</a>;
  }

  const useRouter = window._exta_useRouter;
  const extaRouter = window._exta_router;

  const router = useRouter();
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
    <a href={href} onClick={handleClick} {...props}>
      {props.children}
    </a>
  );
}
