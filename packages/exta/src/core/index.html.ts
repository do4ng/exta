import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

let cache;

export function getIndexHtml(): string {
  if (cache) {
    return cache;
  }

  const path = join(process.cwd(), 'index.html');

  if (existsSync(path)) {
    cache = readFileSync(path, 'utf-8');
    return cache;
  }

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    %head%
  </head>
  <body>
    %body%
  </body>
</html>`;
}
