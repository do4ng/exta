import { describe, it, expect } from 'vitest';
import { convertToRegex } from '../urlPath';

describe('convertToRegex', () => {
  it('should match static route with or without trailing slash', () => {
    const { regex } = convertToRegex('/about/index.tsx');

    expect(regex.test('/about')).toBe(true);
    expect(regex.test('/about/')).toBe(true);
  });

  it('should match dynamic route with or without trailing slash', () => {
    const { regex, params } = convertToRegex('/blog/[slug]/index.tsx');

    expect(params).toEqual(['slug']);
    expect(regex.test('/blog/hello')).toBe(true);
    expect(regex.test('/blog/hello/')).toBe(true);
  });

  it('should match catch-all route with or without trailing slash', () => {
    const { regex, params } = convertToRegex('/docs/[...path].tsx');

    expect(params).toEqual(['path']);
    expect(regex.test('/docs/a/b/c')).toBe(true);
    expect(regex.test('/docs/a/b/c/')).toBe(true);
  });

  it('should not match unrelated paths', () => {
    const { regex } = convertToRegex('/about/index.tsx');

    expect(regex.test('/contact')).toBe(false);
    expect(regex.test('/blog/hello')).toBe(false);
  });
});
