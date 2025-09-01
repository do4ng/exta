import { describe, it, expect } from 'vitest';
import { PageManifest } from '$exta-manifest';

import { findPage } from '../find';

describe('findPage', () => {
  const manifest: PageManifest[] = [
    {
      path: '/blog/[slug]/index.tsx',
      regexp: /^\/blog\/([^/]+)$/,
      params: ['slug'],
      originalPath: '/blog/[slug]/index.tsx',
      buildPath: '',
      buildServerPath: '',
    },
    {
      path: '/about/index.tsx',
      regexp: /^\/about$/,
      params: [],
      originalPath: '/about/index.tsx',
      buildPath: '',
      buildServerPath: '',
    },
  ];

  it('should match static route', () => {
    const result = findPage('/about', manifest);
    expect(result?.path).toBe('/about/index.tsx');
  });

  it('should match dynamic route', () => {
    const result = findPage('/blog/hello-world', manifest);
    expect(result?.path).toBe('/blog/[slug]/index.tsx');
  });

  it('should return null for non-existing route', () => {
    const result = findPage('/contact', manifest);
    expect(result).toBeNull();
  });

  it('should prioritize static route over dynamic', () => {
    const customManifest: PageManifest[] = [
      {
        path: '/user/[id]/index.tsx',
        regexp: /^\/user\/([^/]+)$/,
        params: ['id'],
        originalPath: '/user/[id]/index.tsx',
        buildPath: '',
        buildServerPath: '',
      },
      {
        path: '/user/index.tsx',
        regexp: /^\/user$/,
        params: [],
        originalPath: '/user/index.tsx',
        buildPath: '',
        buildServerPath: '',
      },
    ];
    const result = findPage('/user', customManifest);
    expect(result?.path).toBe('/user/index.tsx');
  });
});
