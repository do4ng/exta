const { dts } = require('rollup-plugin-dts');

const glob = require('glob');
const { dirname, join, parse } = require('node:path');
const { readFileSync } = require('node:fs');

const buildPkgs = glob.globSync('packages/**/*/build.json');

/** @type {import("rollup").RollupOptions[]} */
const config = [];

for (const pkg of buildPkgs) {
  const buildBase = dirname(pkg);
  const configFiles = JSON.parse(readFileSync(join(process.cwd(), pkg), 'utf-8'));
  const packageJSON = JSON.parse(readFileSync(join(buildBase, 'package.json'), 'utf-8'));

  for (const file of configFiles) {
    console.log(join(process.cwd(), buildBase, file));

    config.push({
      input: join(process.cwd(), buildBase, file),
      output: {
        file: join(buildBase, 'dist', parse(file).name + '.d.ts'),
        format: 'es',
      },
      plugins: [dts()],
      external: [
        ...Object.keys(packageJSON.dependencies || {}),
        ...Object.keys(packageJSON.devDependencies || {}),
      ],
    });
  }
}

module.exports = config;
