import { Plugin } from 'esbuild';
import { builtinModules } from 'node:module';
import { join } from 'node:path';
import { CompileOptions } from '~/config/types';

const BUILTIN_MODULES = builtinModules.concat(builtinModules.map((m) => `node:${m}`));

export function sideEffectPlugin(options?: CompileOptions): Plugin {
  return {
    name: 'exta/esbuild-sideeffect-plugin',
    setup(build) {
      build.onResolve({ filter: /.*/ }, async (args) => {
        if (
          BUILTIN_MODULES.includes(args.path) ||
          (options?.ignoreSideEffects &&
            (options?.preserveSideEffects || []).includes(args.path))
        ) {
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

export function vmPlugin(): Plugin {
  return {
    name: 'my-virtual-module-plugin',
    setup(build) {
      build.onResolve({ filter: /^\$exta-router$/ }, (args) => {
        return { path: args.path, namespace: 'virtual' };
      });

      build.onLoad({ filter: /^\$exta-router$/, namespace: 'virtual' }, () => {
        return {
          contents: `module.exports = {};`,
          loader: 'js',
        };
      });
    },
  };
}

export function onlyReact(
  extensions: string[] = ['.css', '.scss', '.sass', '.less'],
  isServerSide: boolean = false,
  options?: CompileOptions,
): Plugin {
  if (options.assetsExtensions) {
    extensions.push(...options.assetsExtensions);
  }

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
          if (isServerSide) {
            return {
              path: args.path,
              namespace: 'exta:ignore',
            };
          }
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
      build.onLoad({ filter: /.*/, namespace: 'exta:ignore' }, () => {
        return {
          contents: '',
          loader: 'js',
        };
      });
    },
  };
}
