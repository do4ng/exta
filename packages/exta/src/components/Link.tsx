import React from 'react';

export function Link({ href, children }: { href: string; children: React.ReactNode }) {
  if (typeof window === 'undefined') {
    return <a href={href}>{children}</a>;
  }

  const useRouter = window._exta_useRouter;
  const extaRouter = window._exta_router;

  const router = useRouter();
  const handleClick = async (e) => {
    e.preventDefault();

    await extaRouter.goto(href);

    router.push(href);
  };

  return (
    <a href={href} onClick={handleClick}>
      {children}
    </a>
  );
}
