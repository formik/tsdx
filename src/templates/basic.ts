import { Template } from './template';

const basicTemplate: Template = {
  name: 'basic',
  dependencies: [
    'husky',
    'tsdx',
    'tslib',
    'typescript',
    'size-limit',
    '@size-limit/preset-small-lib',
  ],
  packageJson: {
    // name: safeName,
    version: '0.1.0',
    license: 'MIT',
    // author: author,
    main: './dist/index.cjs',
    module: './dist/index.mjs',
    exports: {
      './package.json': './package.json',
      '.': {
        import: './dist/index.mjs',
        require: './dist/index.cjs',
      },
    },
    // module: `dist/${safeName}.mjs`,
    typings: `dist/index.d.ts`,
    files: ['dist', 'src'],
    engines: {
      node: '>=14',
    },
    scripts: {
      start: 'tsdx watch',
      build: 'tsdx build',
      test: 'tsdx test',
      posttest: 'node test/import.mjs && node test/require.cjs',
      lint: 'tsdx lint',
      prepare: 'tsdx build',
      size: 'size-limit',
      analyze: 'size-limit --why',
    },
    peerDependencies: {},
    husky: {
      hooks: {
        'pre-commit': 'tsdx lint',
      },
    },
    prettier: {
      printWidth: 80,
      semi: true,
      singleQuote: true,
      trailingComma: 'es5',
    },
  },
};

export default basicTemplate;
