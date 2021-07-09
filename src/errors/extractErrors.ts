// largely borrowed from https://github.com/facebook/react/blob/8b2d3783e58d1acea53428a10d2035a8399060fe/scripts/error-codes/extract-errors.js
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import fs from 'fs-extra';
import { parse, ParserOptions } from '@babel/parser';
import traverse from '@babel/traverse';
import { invertObject } from './invertObject';
import { evalToString } from './evalToString';
import { paths } from '../constants';
import { safeVariableName } from '../utils';
import { pascalCase } from 'pascal-case';

const babelParserOptions: ParserOptions = {
  sourceType: 'module',
  // As a parser, @babel/parser has its own options and we can't directly
  // import/require a babel preset. It should be kept **the same** as
  // the `babel-plugin-syntax-*` ones specified in
  // https://github.com/facebook/fbjs/blob/master/packages/babel-preset-fbjs/configure.js
  plugins: [
    'classProperties',
    'flow',
    'jsx',
    'trailingFunctionCommas',
    'objectRestSpread',
  ],
} as ParserOptions; // workaround for trailingFunctionCommas syntax

export async function extractErrors(opts: any) {
  if (!opts || !opts.errorMapFilePath) {
    throw new Error(
      'Missing options. Ensure you pass an object with `errorMapFilePath`.'
    );
  }

  if (!opts.name || !opts.name) {
    throw new Error('Missing options. Ensure you pass --name flag to tsdx');
  }

  const errorMapFilePath = opts.errorMapFilePath;
  let existingErrorMap: any;
  try {
    /**
     * Using `fs.readFile` instead of `require` here, because `require()` calls
     * are cached, and the cache map is not properly invalidated after file
     * changes.
     */
    const fileContents = await fs.readFile(errorMapFilePath, 'utf-8');
    existingErrorMap = JSON.parse(fileContents);
  } catch (e) {
    existingErrorMap = {};
  }

  const allErrorIDs = Object.keys(existingErrorMap);
  let currentID: any;

  if (allErrorIDs.length === 0) {
    // Map is empty
    currentID = 0;
  } else {
    currentID = Math.max.apply(null, allErrorIDs as any) + 1;
  }

  // Here we invert the map object in memory for faster error code lookup
  existingErrorMap = invertObject(existingErrorMap);

  function transform(source: string) {
    const ast = parse(source, babelParserOptions);

    traverse(ast, {
      CallExpression: {
        exit(astPath: any) {
          if (astPath.get('callee').isIdentifier({ name: 'invariant' })) {
            const node = astPath.node;

            // error messages can be concatenated (`+`) at runtime, so here's a
            // trivial partial evaluator that interprets the literal value
            const errorMsgLiteral = evalToString(node.arguments[1]);
            addToErrorMap(errorMsgLiteral);
          }
        },
      },
    });
  }

  function addToErrorMap(errorMsgLiteral: any) {
    if (existingErrorMap.hasOwnProperty(errorMsgLiteral)) {
      return;
    }
    existingErrorMap[errorMsgLiteral] = '' + currentID++;
  }

  async function flush() {
    const prettyName = pascalCase(safeVariableName(opts.name));
    // Ensure that the ./src/errors directory exists or create it
    await fs.ensureDir(paths.appErrors);

    // Output messages to ./errors/codes.json
    await fs.writeFile(
      errorMapFilePath,
      JSON.stringify(invertObject(existingErrorMap), null, 2) + '\n',
      'utf-8'
    );

    // Write the error files, unless they already exist
    await fs.writeFile(
      paths.appErrors + '/ErrorDev.js',
      `
function ErrorDev(message) {
  const error = new Error(message);
  error.name = 'Invariant Violation';
  return error;
}

export default ErrorDev;
      `,
      'utf-8'
    );

    await fs.writeFile(
      paths.appErrors + '/ErrorProd.js',
      `
function ErrorProd(code) {
  // TODO: replace this URL with yours
  let url = 'https://reactjs.org/docs/error-decoder.html?invariant=' + code;
  for (let i = 1; i < arguments.length; i++) {
    url += '&args[]=' + encodeURIComponent(arguments[i]);
  }
  return new Error(
    \`Minified ${prettyName} error #$\{code}; visit $\{url} for the full message or \` +
      'use the non-minified dev environment for full errors and additional ' +
      'helpful warnings. '
  );
}

export default ErrorProd;
`,
      'utf-8'
    );
  }

  return async function extractErrors(source: any) {
    transform(source);
    await flush();
  };
}
