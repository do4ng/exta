import { Plugin } from 'esbuild';
import { builtinModules } from 'node:module';
import { join, relative } from 'node:path';

const BUILTIN_MODULES = builtinModules.concat(builtinModules.map((m) => `node:${m}`));

export function sideEffectPlugin(): Plugin {
  return {
    name: 'exta/esbuild-sideeffect-plugin',
    setup(build) {
      build.onResolve({ filter: /.*/ }, async (args) => {
        if (BUILTIN_MODULES.includes(args.path)) {
          return {
            sideEffects: false,
            path: args.path,
            external: true,
          };
        }
      });
    },
  };
}

export function onlyReact(
  extensions: string[] = ['.css', '.scss', '.sass', '.less'],
): Plugin {
  return {
    name: 'exta/esbuild-react-plugin',
    setup(build) {
      build.onResolve(
        {
          filter: new RegExp(
            `\\.(${extensions.map((ext) => ext.replace('.', '')).join('|')})$`,
          ),
        },

        (args) => {
          if (args.path.startsWith('.')) {
            return {
              path: join(args.resolveDir, args.path),
              external: true,
            };
          }

          return {
            path: args.path,
            external: true,
          };
        },
      );
    },
  };
}
