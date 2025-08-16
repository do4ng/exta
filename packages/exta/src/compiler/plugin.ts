import { Plugin } from 'esbuild';
import { builtinModules } from 'node:module';

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
          return {
            path: args.path,
            namespace: 'exta-assets',
          };
        },
      );

      build.onLoad({ filter: /.*/, namespace: 'exta-assets' }, (args) => {
        return {
          contents: `import ${JSON.stringify(args.path)};`,
          loader: 'js',
        };
      });
    },
  };
}
