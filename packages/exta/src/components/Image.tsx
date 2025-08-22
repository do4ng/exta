import React from 'react';

export function Image({ src, ...props }: React.ComponentPropsWithoutRef<'img'>) {
  if (typeof window === 'undefined') {
    global.__EXTA_SSR_DATA__.preload.push(src);
  }

  return (
    <img {...props} src={src}>
      {props.children}
    </img>
  );
}
