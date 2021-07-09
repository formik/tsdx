import { safeVariableName, safePackageName, external } from './utils';
import { paths } from './constants';
import { RollupOptions } from 'rollup';
import { terser } from 'rollup-plugin-terser';
import { DEFAULT_EXTENSIONS as DEFAULT_BABEL_EXTENSIONS } from '@babel/core';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import replace from '@rollup/plugin-replace';
import resolve, {
  DEFAULTS as RESOLVE_DEFAULTS,
} from '@rollup/plugin-node-resolve';
import sourceMaps from 'rollup-plugin-sourcemaps';
import typescript from 'rollup-plugin-typescript2';
import ts from 'typescript';

import { extractErrors } from './errors/extractErrors';
import { babelPluginTsdx } from './babelPluginTsdx';
import { TsdxOptions } from './types';

const errorCodeOpts = {
  errorMapFilePath: paths.appErrorsJson,
};

// shebang cache map thing because the transform only gets run once
let shebang: any = {};

export async function createRollupConfig(
  opts: TsdxOptions,
  outputNum: number
): Promise<RollupOptions> {
  const findAndRecordErrorCodes = await extractErrors({
    ...errorCodeOpts,
    ...opts,
  });

  const isEsm = opts.format.includes('es') || opts.format.includes('esm');

  const shouldMinify =
    opts.minify !== undefined ? opts.minify : opts.env === 'production' || isEsm;

  let formatString = ['esm', 'cjs'].includes(opts.format) ? '' : opts.format;
  let fileExtension = opts.format === 'esm' ? 'mjs' : 'cjs';

  const outputName = [
    `${paths.appDist}/${safePackageName(opts.name)}`,
    formatString,
    opts.env,
    shouldMinify ? 'min' : '',
    fileExtension,
  ]
    .filter(Boolean)
    .join('.');

  const tsconfigPath = opts.tsconfig || paths.tsconfigJson;
  // borrowed from https://github.com/facebook/create-react-app/pull/7248
  const tsconfigJSON = ts.readConfigFile(tsconfigPath, ts.sys.readFile).config;
  // borrowed from https://github.com/ezolenko/rollup-plugin-typescript2/blob/42173460541b0c444326bf14f2c8c27269c4cb11/src/parse-tsconfig.ts#L48
  const tsCompilerOptions = ts.parseJsonConfigFileContent(
    tsconfigJSON,
    ts.sys,
    './'
  ).options;

  return {
    // Tell Rollup the entry point to the package
    input: opts.input,
    // Tell Rollup which packages to ignore
    external: (id: string) => {
      // bundle in polyfills as TSDX can't (yet) ensure they're installed as deps
      if (id.startsWith('regenerator-runtime')) {
        return false;
      }

      return external(id);
    },
    // Rollup has treeshaking by default, but we can optimize it further...
    treeshake: {
      // We assume reading a property of an object never has side-effects.
      // This means tsdx WILL remove getters and setters defined directly on objects.
      // Any getters or setters defined on classes will not be effected.
      //
      // @example
      //
      // const foo = {
      //  get bar() {
      //    console.log('effect');
      //    return 'bar';
      //  }
      // }
      //
      // const result = foo.bar;
      // const illegalAccess = foo.quux.tooDeep;
      //
      // Punchline....Don't use getters and setters
      propertyReadSideEffects: false,
    },
    // Establish Rollup output
    output: {
      // Set filenames of the consumer's package
      file: outputName,
      // Pass through the file format
      format: opts.format,
      // Do not let Rollup call Object.freeze() on namespace import objects
      // (i.e. import * as namespaceImportObject from...) that are accessed dynamically.
      freeze: false,
      // Respect tsconfig esModuleInterop when setting __esModule.
      esModule: Boolean(tsCompilerOptions?.esModuleInterop),
      name: opts.name || safeVariableName(opts.name),
      sourcemap: true,
      globals: { react: 'React', 'react-native': 'ReactNative', 'lodash-es': 'lodashEs', 'lodash/fp': 'lodashFp' },
      exports: 'named',
    },
    plugins: [
      !!opts.extractErrors && {
        async transform(code: string) {
          try {
            await findAndRecordErrorCodes(code);
          } catch (e) {
            return null;
          }
          return { code, map: null };
        },
      },
      resolve({
        mainFields: [
          'module',
          'main',
          opts.target !== 'node' ? 'browser' : undefined,
        ].filter(Boolean) as string[],
        extensions: [...RESOLVE_DEFAULTS.extensions, '.cjs', '.mjs', '.jsx'],
      }),
      // all bundled external modules need to be converted from CJS to ESM
      commonjs({
        // use a regex to make sure to include eventual hoisted packages
        include:
          opts.format === 'umd'
            ? /\/node_modules\//
            : /\/regenerator-runtime\//,
      }),
      json(),
      {
        // Custom plugin that removes shebang from code because newer
        // versions of bublé bundle their own private version of `acorn`
        // and I don't know a way to patch in the option `allowHashBang`
        // to acorn. Taken from microbundle.
        // See: https://github.com/Rich-Harris/buble/pull/165
        transform(code: string) {
          let reg = /^#!(.*)/;
          let match = code.match(reg);

          shebang[opts.name] = match ? '#!' + match[1] : '';

          code = code.replace(reg, '');

          return {
            code,
            map: null,
          };
        },
      },
      typescript({
        typescript: ts,
        tsconfig: opts.tsconfig,
        tsconfigDefaults: {
          exclude: [
            // all TS test files, regardless whether co-located or in test/ etc
            '**/*.spec.ts',
            '**/*.test.ts',
            '**/*.spec.tsx',
            '**/*.test.tsx',
            // TS defaults below
            'node_modules',
            'bower_components',
            'jspm_packages',
            paths.appDist,
          ],
          compilerOptions: {
            sourceMap: true,
            declaration: true,
            jsx: 'react',
          },
        },
        tsconfigOverride: {
          compilerOptions: {
            // TS -> esnext, then leave the rest to babel-preset-env
            target: 'esnext',
            // don't output declarations more than once
            ...(outputNum > 0
              ? { declaration: false, declarationMap: false }
              : {}),
          },
        },
        check: !opts.transpileOnly && outputNum === 0,
        useTsconfigDeclarationDir: Boolean(tsCompilerOptions?.declarationDir),
      }),
      babelPluginTsdx({
        exclude: 'node_modules/**',
        extensions: [...DEFAULT_BABEL_EXTENSIONS, 'ts', 'tsx'],
        passPerPreset: true,
        custom: {
          targets: opts.target === 'node' ? { node: '14' } : undefined,
          extractErrors: opts.extractErrors,
          format: opts.format,
        },
        babelHelpers: 'bundled',
      }),
      opts.env !== undefined &&
      replace({
        preventAssignment: true,
        'process.env.NODE_ENV': JSON.stringify(opts.env),
      }),
      sourceMaps(),
      shouldMinify &&
      terser({
        output: { comments: false },
        compress: {
          keep_infinity: true,
          pure_getters: true,
          passes: 10,
        },
        ecma: opts.legacy ? 5 : 2020,
        module: isEsm,
        toplevel: opts.format === 'cjs' || isEsm,
        warnings: true,
      }),
      /**
       * Ensure there's an empty default export to prevent runtime errors.
       *
       * @see https://www.npmjs.com/package/rollup-plugin-export-default
       */
       {
        renderChunk: async (code: string, chunk: any) => {
          if (chunk.exports.includes('default') || !isEsm) {
            return null;
          }

          return {
            code: `${code}\nexport default {};`,
            map: null,
          };
        },
      },
    ],
  };
}
