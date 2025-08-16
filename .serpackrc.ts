import { join } from 'node:path';
import { defineConfig } from 'serpack';

console.log(
  join(
    process.cwd(),
    './packages/',
    process.argv.find((value) => value.startsWith('$'))?.slice(1) || 'exta',
    'tsconfig.json',
  ),
);

export default defineConfig({
  compilerOptions: {
    resolverOptions: {
      tsconfig: {
        configFile: join(
          process.cwd(),
          './packages/',
          process.argv.find((value) => value.startsWith('$'))?.slice(1) || 'exta',
          'tsconfig.json',
        ),
      },
    },
  },
});
