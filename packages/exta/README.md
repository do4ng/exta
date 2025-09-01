# Exta

SSG Framework for React

## Features

- **File-based Routing**: Generates routes based on file names.

- **Fast startup**: Runs with the speed of Vite and Esbuild.

- **Vite-based**: Leverages Vite's broad ecosystem within exta.

- **`.tsx`, `.jsx` support**: Build type-safe apps with TypeScript.

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

## LICENSE

MIT
