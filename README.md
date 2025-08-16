# Exta

Framework for SSG

> [!WARNING]  
> This framework is still under development.

## Concept

**exta** is a static site generator for React.
It aims to provide a fast development server, efficient builds, and search engine optimization (SEO).

- Static Props

The basic concept follows [Next.js](https://nextjs.org).

You can provide params for static page generation through `getStaticParams()` and store static data on the server via `getStaticProps()`.

`getStaticParams` and `getStaticProps` are executed **only once**: during page compilation in development mode, or when a page is first built in production mode (i.e., when static pages are generated).

```ts
export function getStaticParams() {}

export function getStaticProps() {}
```

> Note: The function names above may change during development. We adopted the most commonly used names to make them intuitive and avoid confusion in the development phase. The unique identity of this package will be established as development progresses.

- `<Link />`

```ts
import { Link } from 'exta/components';
```

- Router

Routing-related APIs are provided as a Vite virtual module.

```ts
import { useLocation, useRouter, router } from '$exta-router';

// useLocation() and useRouter() must be used inside React components.

// useLocation is, as the name suggests, a hook that returns the current location.
// (It automatically triggers a re-render whenever the URL changes, so "hook" is the correct term here.)
const location = useLocation();

// useRouter is a URL-related router. It provides methods like push, replace, etc.
const urlRouter = useRouter(); // Can also be accessed via window._exta_useRouter

// router can be used anywhere.
// The router object is the core router that loads page modules and controls the entire page.
// It can also be accessed via window._exta_router.
router.goto('/');
router.preload(router.findPage('/'));
```

## Getting Started

- **Download Template**

You can download the current application template from [this repository](https://github.com/do4ng/exta-template).

```bash
git clone https://github.com/do4ng/exta-template my-app
```

- **Start Manually**

exta is provided as a Vite plugin.
Install the exta core package and the Vite React plugin to apply exta to an existing project.

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { exta } from 'exta';

export default defineConfig({
  plugins: [react(), exta()],
});
```

```ts
// env.d.ts
import 'exta/env';
```

## Current Status

All functionalities for page routing and rendering pages have been implemented. However, basic SSR (server-side rendering) for SEO, support for external assets like CSS, and other APIs for a better development experience are still in progress. Also, exta loads all pages on the first page load.
This approach may not be an issue for small sites, but for large websites, the initial loading time can become very long. This problem is also planned to be improved in a future update.

To test whether the exta framework works well, an attempt is underway to migrate an existing [Next.js-based blog](https://do4ng.vercel.app) to exta. The main pros and cons of this approach are as follows.

### Advantages (as of 0.0.1-beta.5)

- Faster server start: from \~10 seconds → under 1 second
- Faster compile time (first compile): from \~5 seconds → 3 seconds
- Faster build time: from \~30 seconds → 4 seconds

Leveraging Vite + esbuild significantly reduces development time.

### Disadvantages

- Cannot import assets within JS files _(to be implemented)_
- Simple SSR for SEO is not yet available _(to be implemented)_
- Features are limited compared to Next.js’s powerful APIs

There are more pros and cons, but these are the main ones.

## LICENSE

MIT
