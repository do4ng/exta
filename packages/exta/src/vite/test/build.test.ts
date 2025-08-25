import { describe, it, expect } from 'vitest';
import React from 'react';
import { Manifest } from 'vite';

import { collectCssFiles, serverRendering } from '~/vite/builder/ssr';

// React dummy component for page
function DummyPage({ props }: { props?: any }) {
  return React.createElement('div', null, `Hello ${props?.msg || 'World'}`);
}

describe('serverRendering', () => {
  it('should inject css, preload, and scripts into head', () => {
    const template = `<!DOCTYPE html><html><head><title>Test</title></head><body><div id="_app"></div></body></html>`;

    const html = serverRendering(
      DummyPage,
      ({ children }: any) => React.createElement('div', { id: 'layout' }, children),
      { props: { msg: 'SSR' } },
      template,
      ['style.css'],
      { '/index.json': null },
      '/index',
      ['client.js'],
    );

    expect(html).toContain('<link rel="stylesheet" href="/style.css" />');
    expect(html).toContain('<link rel="modulepreload" href="/client.js">');
    expect(html).toContain('Hello SSR');
    expect(html).toContain(
      '<div id="_app"><div id="layout"><div>Hello SSR</div></div></div>',
    );
  });
});

describe('collectCssFiles', () => {
  it('should collect css dependencies recursively', () => {
    const manifest: Manifest = {
      'entry.js': {
        file: 'entry.js',
        css: ['entry.css'],
        imports: ['dep.js'],
      },
      'dep.js': {
        file: 'dep.js',
        css: ['dep.css'],
      },
    } as any;

    const css = collectCssFiles(manifest, 'entry.js');
    expect(css).toContain('entry.css');
    expect(css).toContain('dep.css');
  });
});
