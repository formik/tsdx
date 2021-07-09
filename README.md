![tsdx](https://user-images.githubusercontent.com/4060187/56918426-fc747600-6a8b-11e9-806d-2da0b49e89e4.png)

[![Blazing Fast](https://badgen.now.sh/badge/speed/blazing%20%F0%9F%94%A5/green)](https://npm.im/tsdx) [![Blazing Fast](https://badgen.now.sh/badge/speed/blazing%20%F0%9F%94%A5/green)](https://npm.im/tsdx) [![Blazing Fast](https://badgen.now.sh/badge/speed/blazing%20%F0%9F%94%A5/green)](https://npm.im/tsdx) [![Discord](https://img.shields.io/discord/769256827007139912.svg?style=flat-square)](https://discord.gg/pJSg287)


Despite all the recent hype, setting up a new TypeScript (x React) library can be tough. Between [Rollup](https://github.com/rollup/rollup), [Jest](https://github.com/facebook/jest), `tsconfig`, [Yarn resolutions](https://yarnpkg.com/en/docs/selective-version-resolutions), ESLint, and getting VSCode to play nicely....there is just a whole lot of stuff to do (and things to screw up). TSDX is a zero-config CLI that helps you develop, test, and publish modern TypeScript packages with ease--so you can focus on your awesome new library and not waste another afternoon on the configuration.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Features](#features)
- [Quick Start](#quick-start)
  - [`npm start` or `yarn start`](#npm-start-or-yarn-start)
  - [`npm run build` or `yarn build`](#npm-run-build-or-yarn-build)
  - [`npm test` or `yarn test`](#npm-test-or-yarn-test)
  - [`npm run lint` or `yarn lint`](#npm-run-lint-or-yarn-lint)
  - [`prepare` script](#prepare-script)
- [Optimizations](#optimizations)
  - [Development-only Expressions + Treeshaking](#development-only-expressions--treeshaking)
    - [Rollup Treeshaking](#rollup-treeshaking)
    - [Advanced `babel-plugin-dev-expressions`](#advanced-babel-plugin-dev-expressions)
      - [`__DEV__`](#__dev__)
      - [`invariant`](#invariant)
      - [`warning`](#warning)
  - [Using lodash](#using-lodash)
  - [Error extraction](#error-extraction)
- [Customization](#customization)
  - [Rollup](#rollup)
    - [Example: Adding Postcss](#example-adding-postcss)
  - [Babel](#babel)
  - [Jest](#jest)
  - [ESLint](#eslint)
  - [`patch-package`](#patch-package)
- [Inspiration](#inspiration)
  - [Comparison with Microbundle](#comparison-with-microbundle)
- [API Reference](#api-reference)
  - [`tsdx watch`](#tsdx-watch)
  - [`tsdx build`](#tsdx-build)
  - [`tsdx test`](#tsdx-test)
  - [`tsdx lint`](#tsdx-lint)
- [Contributing](#contributing)
- [Author](#author)
- [License](#license)
- [Contributors ✨](#contributors-)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Features

TSDX comes with the "battery-pack included" and is part of a complete TypeScript breakfast:

- Bundles your code with [Rollup](https://github.com/rollup/rollup) and outputs multiple module formats (CJS & ESM by default, and also UMD if you want) plus development and production builds
- Comes with treeshaking, ready-to-rock lodash optimizations, and minification/compression
- Live reload / watch-mode
- Works with React
- Human readable error messages (and in VSCode-friendly format)
- Bundle size snapshots
- Opt-in to extract `invariant` error codes
- Jest test runner setup with sensible defaults via `tsdx test`
- ESLint with Prettier setup with sensible defaults via `tsdx lint`
- Zero-config, single dependency
- Escape hatches for customization via `.babelrc.js`, `jest.config.js`, `.eslintrc.js`, and `tsdx.config.js`

## Quick Start

```bash
npx tsdx create mylib
cd mylib
yarn start
```

That's it. You don't need to worry about setting up TypeScript or Rollup or Jest or other plumbing. Just start editing `src/index.ts` and go!

Below is a list of commands you will probably find useful:

### `npm start` or `yarn start`

Runs the project in development/watch mode. Your project will be rebuilt upon changes. TSDX has a special logger for your convenience. Error messages are pretty printed and formatted for compatibility VS Code's Problems tab.

<img src="https://user-images.githubusercontent.com/4060187/52168303-574d3a00-26f6-11e9-9f3b-71dbec9ebfcb.gif" width="600" />

Your library will be rebuilt if you make edits.

### `npm run build` or `yarn build`

Bundles the package to the `dist` folder.
The package is optimized and bundled with Rollup into multiple formats (CommonJS, UMD, and ES Module).

<img src="https://user-images.githubusercontent.com/4060187/52168322-a98e5b00-26f6-11e9-8cf6-222d716b75ef.gif" width="600" />

### `npm test` or `yarn test`

Runs your tests using Jest.

### `npm run lint` or `yarn lint`

Runs Eslint with Prettier on .ts and .tsx files.
If you want to customize eslint you can add an `eslint` block to your package.json, or you can run `yarn lint --write-file` and edit the generated `.eslintrc.js` file.

### `prepare` script

Bundles and packages to the `dist` folder.
Runs automatically when you run either `npm publish` or `yarn publish`. The `prepare` script will run the equivalent of `npm run build` or `yarn build`. It will also be run if your module is installed as a git dependency (ie: `"mymodule": "github:myuser/mymodule#some-branch"`) so it can be depended on without checking the transpiled code into git.

## Optimizations

Aside from just bundling your module into different formats, TSDX comes with some optimizations for your convenience. They yield objectively better code and smaller bundle sizes.

After TSDX compiles your code with TypeScript, it processes your code with 3 Babel plugins:

- [`babel-plugin-annotate-pure-calls`](https://github.com/Andarist/babel-plugin-annotate-pure-calls): Injects for `#__PURE` annotations to enable treeshaking
- [`babel-plugin-dev-expressions`](https://github.com/4Catalyzer/babel-plugin-dev-expression): A mirror of Facebook's dev-expression Babel plugin. It reduces or eliminates development checks from production code
- [`babel-plugin-rename-import`](https://github.com/laat/babel-plugin-transform-rename-import): Used to rewrite any `lodash` imports

### Development-only Expressions + Treeshaking

`babel-plugin-annotate-pure-calls` + `babel-plugin-dev-expressions` work together to fully eliminate dead code (aka treeshake) development checks from your production code. Let's look at an example to see how it works.

Imagine our source code is just this:

```tsx
// ./src/index.ts
export const sum = (a: number, b: number) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Helpful dev-only error message');
  }
  return a + b;
};
```

`tsdx build` will output an ES module file and 3 CommonJS files (dev, prod, and an entry file). If you want to specify a UMD build, you can do that as well. For brevity, let's examine the CommonJS output (comments added for emphasis):

```js
// Entry File
// ./dist/index.js
'use strict';

// This determines which build to use based on the `NODE_ENV` of your end user.
if (process.env.NODE_ENV === 'production') {
  module.exports = require('./mylib.cjs.production.js');
} else {
  module.exports = require('./mylib.development.cjs');
}
```

```js
// CommonJS Development Build
// ./dist/mylib.development.cjs
'use strict';

const sum = (a, b) => {
  {
    console.log('Helpful dev-only error message');
  }

  return a + b;
};

exports.sum = sum;
//# sourceMappingURL=mylib.development.cjs.map
```

```js
// CommonJS Production Build
// ./dist/mylib.cjs.production.js
'use strict';
exports.sum = (s, t) => s + t;
//# sourceMappingURL=test-react-tsdx.cjs.production.js.map
```

AS you can see, TSDX stripped out the development check from the production code. **This allows you to safely add development-only behavior (like more useful error messages) without any production bundle size impact.**

For ESM build, it's up to end-user to build environment specific build with NODE_ENV replace (done by Webpack 4 automatically).

#### Rollup Treeshaking

TSDX's rollup config [removes getters and setters on objects](https://github.com/palmerhq/tsdx/blob/1f6a1b6819bb17678aa417f0df5349bec12f59ac/src/createRollupConfig.ts#L73) so that property access has no side effects. Don't do it.

#### Advanced `babel-plugin-dev-expressions`

TSDX will use `babel-plugin-dev-expressions` to make the following replacements _before_ treeshaking.

##### `__DEV__`

Replaces

```ts
if (__DEV__) {
  console.log('foo');
}
```

with

```js
if (process.env.NODE_ENV !== 'production') {
  console.log('foo');
}
```

**IMPORTANT:** To use `__DEV__` in TypeScript, you need to add `declare var __DEV__: boolean` somewhere in your project's type path (e.g. `./types/index.d.ts`).

```ts
// ./types/index.d.ts
declare var __DEV__: boolean;
```

> **Note:** The `dev-expression` transform does not run when `NODE_ENV` is `test`. As such, if you use `__DEV__`, you will need to define it as a global constant in your test environment.

##### `invariant`

Replaces

```js
invariant(condition, 'error message here');
```

with

```js
if (!condition) {
  if ('production' !== process.env.NODE_ENV) {
    invariant(false, 'error message here');
  } else {
    invariant(false);
  }
}
```

Note: TSDX doesn't supply an `invariant` function for you, you need to import one yourself. We recommend https://github.com/alexreardon/tiny-invariant.

To extract and minify `invariant` error codes in production into a static `codes.json` file, specify the `--extractErrors` flag in command line. For more details see [Error extraction docs](#error-extraction).

##### `warning`

Replaces

```js
warning(condition, 'dev warning here');
```

with

```js
if ('production' !== process.env.NODE_ENV) {
  warning(condition, 'dev warning here');
}
```

Note: TSDX doesn't supply a `warning` function for you, you need to import one yourself. We recommend https://github.com/alexreardon/tiny-warning.

### Using lodash

If you want to use a lodash function in your package, TSDX will help you do it the _right_ way so that your library does not get fat shamed on Twitter. However, before you continue, seriously consider rolling whatever function you are about to use on your own. Anyways, here is how to do it right.

First, install `lodash` and `lodash-es` as _dependencies_

```bash
yarn add lodash lodash-es
```

Now install `@types/lodash` to your development dependencies.

```bash
yarn add @types/lodash --dev
```

Import your lodash method however you want, TSDX will optimize it like so.

```tsx
// ./src/index.ts
import kebabCase from 'lodash/kebabCase';

export const KebabLogger = (msg: string) => {
  console.log(kebabCase(msg));
};
```

For brevity let's look at the ES module output.

<!-- prettier-ignore -->
```js
import o from"lodash-es/kebabCase";const e=e=>{console.log(o(e))};export{e as KebabLogger};
//# sourceMappingURL=test-react-tsdx.esm.production.js.map
```

TSDX will rewrite your `import kebabCase from 'lodash/kebabCase'` to `import o from 'lodash-es/kebabCase'`. This allows your library to be treeshakable to end consumers while allowing to you to use `@types/lodash` for free.

> Note: TSDX will also transform destructured imports. For example, `import { kebabCase } from 'lodash'` would have also been transformed to `import o from "lodash-es/kebabCase".

### Error extraction

After running `--extractErrors`, you will have a `./errors/codes.json` file with all your extracted `invariant` error codes. This process scans your production code and swaps out your `invariant` error message strings for a corresponding error code (just like React!). This extraction only works if your error checking/warning is done by a function called `invariant`.

Note: We don't provide this function for you, it is up to you how you want it to behave. For example, you can use either `tiny-invariant` or `tiny-warning`, but you must then import the module as a variable called `invariant` and it should have the same type signature.

⚠️Don't forget: you will need to host the decoder somewhere. Once you have a URL, look at `./errors/ErrorProd.js` and replace the `reactjs.org` URL with yours.

> Known issue: our `transformErrorMessages` babel plugin currently doesn't have sourcemap support, so you will see "Sourcemap is likely to be incorrect" warnings. [We would love your help on this.](https://github.com/palmerhq/tsdx/issues/184)

_TODO: Simple guide to host error codes to be completed_

## Customization

### Rollup

> **❗⚠️❗ Warning**: <br>
> These modifications will override the default behavior and configuration of TSDX. As such they can invalidate internal guarantees and assumptions. These types of changes can break internal behavior and can be very fragile against updates. Use with discretion!

TSDX uses Rollup under the hood. The defaults are solid for most packages (Formik uses the defaults!). However, if you do wish to alter the rollup configuration, you can do so by creating a file called `tsdx.config.js` at the root of your project like so:

```js
// Not transpiled with TypeScript or Babel, so use plain Es6/Node.js!
module.exports = {
  // This function will run for each entry/format/env combination
  rollup(config, options) {
    return config; // always return a config.
  },
};
```

The `options` object contains the following:

```tsx
export interface TsdxOptions {
  // path to file
  input: string;
  // Name of package
  name: string;
  // JS target
  target: 'node' | 'browser';
  // Module format
  format: 'cjs' | 'umd' | 'esm' | 'system';
  // Environment
  env: 'development' | 'production';
  // Path to tsconfig file
  tsconfig?: string;
  // Is error extraction running?
  extractErrors?: boolean;
  // Is minifying?
  minify?: boolean;
  // Is this the very first rollup config (and thus should one-off metadata be extracted)?
  writeMeta?: boolean;
  // Only transpile, do not type check (makes compilation faster)
  transpileOnly?: boolean;
}
```

#### Example: Adding Postcss

```js
const postcss = require('rollup-plugin-postcss');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');

module.exports = {
  rollup(config, options) {
    config.plugins.push(
      postcss({
        plugins: [
          autoprefixer(),
          cssnano({
            preset: 'default',
          }),
        ],
        inject: false,
        // only write out CSS for the first bundle (avoids pointless extra files):
        extract: !!options.writeMeta,
      })
    );
    return config;
  },
};
```

### Babel

You can add your own `.babelrc` to the root of your project and TSDX will **merge** it with [its own Babel transforms](./src/babelPluginTsdx.ts) (which are mostly for optimization), putting any new presets and plugins at the end of its list.

### Jest

You can add your own `jest.config.js` to the root of your project and TSDX will **shallow merge** it with [its own Jest config](./src/createJestConfig.ts).

### ESLint

You can add your own `.eslintrc.js` to the root of your project and TSDX will **deep merge** it with [its own ESLint config](./src/createEslintConfig.ts).

### `patch-package`

If you still need more customizations, we recommend using [`patch-package`](https://github.com/ds300/patch-package) so you don't need to fork.
Keep in mind that these types of changes may be quite fragile against version updates.

## Inspiration

TSDX was originally ripped out of [Formik's](https://github.com/jaredpalmer/formik) build tooling.
TSDX has several similarities to [@developit/microbundle](https://github.com/developit/microbundle), but that is because Formik's Rollup configuration and Microbundle's internals had converged around similar plugins.

### Comparison with Microbundle

Some key differences include:

- TSDX includes out-of-the-box test running via Jest
- TSDX includes out-of-the-box linting and formatting via ESLint and Prettier
- TSDX includes a bootstrap command with a few package templates
- TSDX allows for some lightweight customization
- TSDX is TypeScript focused, but also supports plain JavaScript
- TSDX outputs distinct development and production builds (like React does) for CJS and UMD builds. This means you can include rich error messages and other dev-friendly goodies without sacrificing final bundle size.

## API Reference

### `tsdx watch`

```shell
Description
  Rebuilds on any change

Usage
  $ tsdx watch [options]

Options
  -i, --entry           Entry module
  --target              Specify your target environment  (default web)
  --name                Specify name exposed in UMD builds
  --format              Specify module format(s)  (default cjs,esm)
  --tsconfig            Specify your custom tsconfig path (default <root-folder>/tsconfig.json)
  --verbose             Keep outdated console output in watch mode instead of clearing the screen
  --onFirstSuccess      Run a command on the first successful build
  --onSuccess           Run a command on a successful build
  --onFailure           Run a command on a failed build
  --noClean             Don't clean the dist folder
  --transpileOnly       Skip type checking
  -h, --help            Displays this message

Examples
  $ tsdx watch --entry src/foo.tsx
  $ tsdx watch --target node
  $ tsdx watch --name Foo
  $ tsdx watch --format cjs,esm,umd
  $ tsdx watch --tsconfig ./tsconfig.foo.json
  $ tsdx watch --noClean
  $ tsdx watch --onFirstSuccess "echo The first successful build!"
  $ tsdx watch --onSuccess "echo Successful build!"
  $ tsdx watch --onFailure "echo The build failed!"
  $ tsdx watch --transpileOnly
```

### `tsdx build`

```shell
Description
  Build your project once and exit

Usage
  $ tsdx build [options]

Options
  -i, --entry           Entry module
  --target              Specify your target environment  (default web)
  --name                Specify name exposed in UMD builds
  --format              Specify module format(s)  (default cjs,esm)
  --extractErrors       Opt-in to extracting invariant error codes
  --tsconfig            Specify your custom tsconfig path (default <root-folder>/tsconfig.json)
  --transpileOnly       Skip type checking
  -h, --help            Displays this message

Examples
  $ tsdx build --entry src/foo.tsx
  $ tsdx build --target node
  $ tsdx build --name Foo
  $ tsdx build --format cjs,esm,umd
  $ tsdx build --extractErrors
  $ tsdx build --tsconfig ./tsconfig.foo.json
  $ tsdx build --transpileOnly
```

### `tsdx test`

This runs Jest, forwarding all CLI flags to it. See [https://jestjs.io](https://jestjs.io) for options. For example, if you would like to run in watch mode, you can run `tsdx test --watch`. So you could set up your `package.json` `scripts` like:

```json
{
  "scripts": {
    "test": "tsdx test",
    "test:watch": "tsdx test --watch",
    "test:coverage": "tsdx test --coverage"
  }
}
```

### `tsdx lint`

```shell
Description
  Run eslint with Prettier

Usage
  $ tsdx lint [options]

Options
  --fix               Fixes fixable errors and warnings
  --ignore-pattern    Ignore a pattern
  --max-warnings      Exits with non-zero error code if number of warnings exceed this number  (default Infinity)
  --write-file        Write the config file locally
  --report-file       Write JSON report to file locally
  -h, --help          Displays this message

Examples
  $ tsdx lint src
  $ tsdx lint src --fix
  $ tsdx lint src test --ignore-pattern test/foo.ts
  $ tsdx lint src test --max-warnings 10
  $ tsdx lint src --write-file
  $ tsdx lint src --report-file report.json
```

## Contributing

Please see the [Contributing Guidelines](./CONTRIBUTING.md).

## Author

- [Jared Palmer](https://twitter.com/jaredpalmer)

## License

[MIT](https://oss.ninja/mit/jaredpalmer/)

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://jaredpalmer.com"><img src="https://avatars2.githubusercontent.com/u/4060187?v=4" width="100px;" alt=""/><br /><sub><b>Jared Palmer</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=jaredpalmer" title="Documentation">📖</a> <a href="#design-jaredpalmer" title="Design">🎨</a> <a href="https://github.com/formium/tsdx/pulls?q=is%3Apr+reviewed-by%3Ajaredpalmer" title="Reviewed Pull Requests">👀</a> <a href="#tool-jaredpalmer" title="Tools">🔧</a> <a href="https://github.com/formium/tsdx/commits?author=jaredpalmer" title="Tests">⚠️</a> <a href="#maintenance-jaredpalmer" title="Maintenance">🚧</a> <a href="https://github.com/formium/tsdx/commits?author=jaredpalmer" title="Code">💻</a></td>
    <td align="center"><a href="https://twitter.com/swyx"><img src="https://avatars1.githubusercontent.com/u/6764957?v=4" width="100px;" alt=""/><br /><sub><b>swyx</b></sub></a><br /><a href="https://github.com/formium/tsdx/issues?q=author%3Asw-yx" title="Bug reports">🐛</a> <a href="https://github.com/formium/tsdx/commits?author=sw-yx" title="Code">💻</a> <a href="https://github.com/formium/tsdx/commits?author=sw-yx" title="Documentation">📖</a> <a href="#design-sw-yx" title="Design">🎨</a> <a href="#ideas-sw-yx" title="Ideas, Planning, & Feedback">🤔</a> <a href="#infra-sw-yx" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#maintenance-sw-yx" title="Maintenance">🚧</a> <a href="https://github.com/formium/tsdx/pulls?q=is%3Apr+reviewed-by%3Asw-yx" title="Reviewed Pull Requests">👀</a></td>
    <td align="center"><a href="https://jasonet.co"><img src="https://avatars1.githubusercontent.com/u/10660468?v=4" width="100px;" alt=""/><br /><sub><b>Jason Etcovitch</b></sub></a><br /><a href="https://github.com/formium/tsdx/issues?q=author%3AJasonEtco" title="Bug reports">🐛</a> <a href="https://github.com/formium/tsdx/commits?author=JasonEtco" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/skvale"><img src="https://avatars0.githubusercontent.com/u/5314713?v=4" width="100px;" alt=""/><br /><sub><b>Sam Kvale</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=skvale" title="Code">💻</a> <a href="https://github.com/formium/tsdx/commits?author=skvale" title="Tests">⚠️</a> <a href="https://github.com/formium/tsdx/issues?q=author%3Askvale" title="Bug reports">🐛</a> <a href="https://github.com/formium/tsdx/commits?author=skvale" title="Documentation">📖</a> <a href="https://github.com/formium/tsdx/pulls?q=is%3Apr+reviewed-by%3Askvale" title="Reviewed Pull Requests">👀</a> <a href="#ideas-skvale" title="Ideas, Planning, & Feedback">🤔</a> <a href="#question-skvale" title="Answering Questions">💬</a></td>
    <td align="center"><a href="https://lucaspolito.dev/"><img src="https://avatars3.githubusercontent.com/u/41299650?v=4" width="100px;" alt=""/><br /><sub><b>Lucas Polito</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=lpolito" title="Code">💻</a> <a href="https://github.com/formium/tsdx/commits?author=lpolito" title="Documentation">📖</a> <a href="#question-lpolito" title="Answering Questions">💬</a></td>
    <td align="center"><a href="https://skalt.github.io"><img src="https://avatars0.githubusercontent.com/u/10438373?v=4" width="100px;" alt=""/><br /><sub><b>Steven Kalt</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=SKalt" title="Code">💻</a></td>
    <td align="center"><a href="https://twitter.com/harry_hedger"><img src="https://avatars2.githubusercontent.com/u/2524280?v=4" width="100px;" alt=""/><br /><sub><b>Harry Hedger</b></sub></a><br /><a href="#ideas-hedgerh" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/formium/tsdx/commits?author=hedgerh" title="Documentation">📖</a> <a href="https://github.com/formium/tsdx/commits?author=hedgerh" title="Code">💻</a> <a href="#question-hedgerh" title="Answering Questions">💬</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/arthurdenner"><img src="https://avatars0.githubusercontent.com/u/13774309?v=4" width="100px;" alt=""/><br /><sub><b>Arthur Denner</b></sub></a><br /><a href="https://github.com/formium/tsdx/issues?q=author%3Aarthurdenner" title="Bug reports">🐛</a> <a href="https://github.com/formium/tsdx/commits?author=arthurdenner" title="Code">💻</a> <a href="#question-arthurdenner" title="Answering Questions">💬</a></td>
    <td align="center"><a href="https://carlfoster.io"><img src="https://avatars2.githubusercontent.com/u/5793483?v=4" width="100px;" alt=""/><br /><sub><b>Carl</b></sub></a><br /><a href="#ideas-Carl-Foster" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/formium/tsdx/commits?author=Carl-Foster" title="Documentation">📖</a> <a href="https://github.com/formium/tsdx/commits?author=Carl-Foster" title="Code">💻</a> <a href="https://github.com/formium/tsdx/commits?author=Carl-Foster" title="Tests">⚠️</a> <a href="#question-Carl-Foster" title="Answering Questions">💬</a></td>
    <td align="center"><a href="http://iGLOO.be"><img src="https://avatars0.githubusercontent.com/u/900947?v=4" width="100px;" alt=""/><br /><sub><b>Loïc Mahieu</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=LoicMahieu" title="Code">💻</a> <a href="https://github.com/formium/tsdx/commits?author=LoicMahieu" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/sebald"><img src="https://avatars3.githubusercontent.com/u/985701?v=4" width="100px;" alt=""/><br /><sub><b>Sebastian Sebald</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=sebald" title="Documentation">📖</a> <a href="https://github.com/formium/tsdx/commits?author=sebald" title="Code">💻</a> <a href="https://github.com/formium/tsdx/commits?author=sebald" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://twitter.com/karlhorky"><img src="https://avatars2.githubusercontent.com/u/1935696?v=4" width="100px;" alt=""/><br /><sub><b>Karl Horky</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=karlhorky" title="Documentation">📖</a> <a href="#ideas-karlhorky" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://ghuser.io/jamesgeorge007"><img src="https://avatars2.githubusercontent.com/u/25279263?v=4" width="100px;" alt=""/><br /><sub><b>James George</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=jamesgeorge007" title="Documentation">📖</a></td>
    <td align="center"><a href="https://twitter.com/agilgur5"><img src="https://avatars3.githubusercontent.com/u/4970083?v=4" width="100px;" alt=""/><br /><sub><b>Anton Gilgur</b></sub></a><br /><a href="#maintenance-agilgur5" title="Maintenance">🚧</a> <a href="https://github.com/formium/tsdx/commits?author=agilgur5" title="Documentation">📖</a> <a href="https://github.com/formium/tsdx/commits?author=agilgur5" title="Code">💻</a> <a href="https://github.com/formium/tsdx/issues?q=author%3Aagilgur5" title="Bug reports">🐛</a> <a href="#example-agilgur5" title="Examples">💡</a> <a href="#ideas-agilgur5" title="Ideas, Planning, & Feedback">🤔</a> <a href="#question-agilgur5" title="Answering Questions">💬</a> <a href="https://github.com/formium/tsdx/pulls?q=is%3Apr+reviewed-by%3Aagilgur5" title="Reviewed Pull Requests">👀</a> <a href="https://github.com/formium/tsdx/commits?author=agilgur5" title="Tests">⚠️</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://kylemh.com"><img src="https://avatars1.githubusercontent.com/u/9523719?v=4" width="100px;" alt=""/><br /><sub><b>Kyle Holmberg</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=kylemh" title="Code">💻</a> <a href="#example-kylemh" title="Examples">💡</a> <a href="https://github.com/formium/tsdx/commits?author=kylemh" title="Tests">⚠️</a> <a href="https://github.com/formium/tsdx/pulls?q=is%3Apr+reviewed-by%3Akylemh" title="Reviewed Pull Requests">👀</a> <a href="#question-kylemh" title="Answering Questions">💬</a></td>
    <td align="center"><a href="https://github.com/sisp"><img src="https://avatars1.githubusercontent.com/u/2206639?v=4" width="100px;" alt=""/><br /><sub><b>Sigurd Spieckermann</b></sub></a><br /><a href="https://github.com/formium/tsdx/issues?q=author%3Asisp" title="Bug reports">🐛</a> <a href="https://github.com/formium/tsdx/commits?author=sisp" title="Code">💻</a></td>
    <td align="center"><a href="https://www.selbekk.io"><img src="https://avatars1.githubusercontent.com/u/1307267?v=4" width="100px;" alt=""/><br /><sub><b>Kristofer Giltvedt Selbekk</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=selbekk" title="Code">💻</a></td>
    <td align="center"><a href="https://tomasehrlich.cz"><img src="https://avatars2.githubusercontent.com/u/827862?v=4" width="100px;" alt=""/><br /><sub><b>Tomáš Ehrlich</b></sub></a><br /><a href="https://github.com/formium/tsdx/issues?q=author%3Atricoder42" title="Bug reports">🐛</a> <a href="https://github.com/formium/tsdx/commits?author=tricoder42" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/kyle-johnson"><img src="https://avatars3.githubusercontent.com/u/1007162?v=4" width="100px;" alt=""/><br /><sub><b>Kyle Johnson</b></sub></a><br /><a href="https://github.com/formium/tsdx/issues?q=author%3Akyle-johnson" title="Bug reports">🐛</a> <a href="https://github.com/formium/tsdx/commits?author=kyle-johnson" title="Code">💻</a></td>
    <td align="center"><a href="http://www.etiennedeladonchamps.fr/"><img src="https://avatars3.githubusercontent.com/u/14336608?v=4" width="100px;" alt=""/><br /><sub><b>Etienne Dldc</b></sub></a><br /><a href="https://github.com/formium/tsdx/issues?q=author%3Aetienne-dldc" title="Bug reports">🐛</a> <a href="https://github.com/formium/tsdx/commits?author=etienne-dldc" title="Code">💻</a> <a href="https://github.com/formium/tsdx/commits?author=etienne-dldc" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/fknop"><img src="https://avatars2.githubusercontent.com/u/6775689?v=4" width="100px;" alt=""/><br /><sub><b>Florian Knop</b></sub></a><br /><a href="https://github.com/formium/tsdx/issues?q=author%3Afknop" title="Bug reports">🐛</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/gndelia"><img src="https://avatars1.githubusercontent.com/u/352474?v=4" width="100px;" alt=""/><br /><sub><b>Gonzalo D'Elia</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=gndelia" title="Code">💻</a></td>
    <td align="center"><a href="https://patreon.com/aleclarson"><img src="https://avatars2.githubusercontent.com/u/1925840?v=4" width="100px;" alt=""/><br /><sub><b>Alec Larson</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=aleclarson" title="Code">💻</a> <a href="https://github.com/formium/tsdx/pulls?q=is%3Apr+reviewed-by%3Aaleclarson" title="Reviewed Pull Requests">👀</a> <a href="#ideas-aleclarson" title="Ideas, Planning, & Feedback">🤔</a> <a href="#question-aleclarson" title="Answering Questions">💬</a></td>
    <td align="center"><a href="http://cantaloupesys.com/"><img src="https://avatars2.githubusercontent.com/u/277214?v=4" width="100px;" alt=""/><br /><sub><b>Justin Grant</b></sub></a><br /><a href="https://github.com/formium/tsdx/issues?q=author%3Ajustingrant" title="Bug reports">🐛</a> <a href="#ideas-justingrant" title="Ideas, Planning, & Feedback">🤔</a> <a href="#question-justingrant" title="Answering Questions">💬</a></td>
    <td align="center"><a href="http://n3tr.com"><img src="https://avatars3.githubusercontent.com/u/155392?v=4" width="100px;" alt=""/><br /><sub><b>Jirat Ki.</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=n3tr" title="Code">💻</a> <a href="https://github.com/formium/tsdx/commits?author=n3tr" title="Tests">⚠️</a> <a href="https://github.com/formium/tsdx/issues?q=author%3An3tr" title="Bug reports">🐛</a></td>
    <td align="center"><a href="http://natemoo.re"><img src="https://avatars0.githubusercontent.com/u/7118177?v=4" width="100px;" alt=""/><br /><sub><b>Nate Moore</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=natemoo-re" title="Code">💻</a> <a href="#ideas-natemoo-re" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://twitter.com/diegohaz"><img src="https://avatars3.githubusercontent.com/u/3068563?v=4" width="100px;" alt=""/><br /><sub><b>Haz</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=diegohaz" title="Documentation">📖</a></td>
    <td align="center"><a href="http://bastibuck.de"><img src="https://avatars1.githubusercontent.com/u/6306291?v=4" width="100px;" alt=""/><br /><sub><b>Basti Buck</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=bastibuck" title="Code">💻</a> <a href="https://github.com/formium/tsdx/issues?q=author%3Abastibuck" title="Bug reports">🐛</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://pablosz.tech"><img src="https://avatars3.githubusercontent.com/u/8672915?v=4" width="100px;" alt=""/><br /><sub><b>Pablo Saez</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=PabloSzx" title="Code">💻</a> <a href="https://github.com/formium/tsdx/issues?q=author%3APabloSzx" title="Bug reports">🐛</a></td>
    <td align="center"><a href="http://www.twitter.com/jake_gavin"><img src="https://avatars2.githubusercontent.com/u/5965895?v=4" width="100px;" alt=""/><br /><sub><b>Jake Gavin</b></sub></a><br /><a href="https://github.com/formium/tsdx/issues?q=author%3Ajakegavin" title="Bug reports">🐛</a> <a href="https://github.com/formium/tsdx/commits?author=jakegavin" title="Code">💻</a></td>
    <td align="center"><a href="https://grantforrest.dev"><img src="https://avatars1.githubusercontent.com/u/2829772?v=4" width="100px;" alt=""/><br /><sub><b>Grant Forrest</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=a-type" title="Code">💻</a> <a href="https://github.com/formium/tsdx/commits?author=a-type" title="Tests">⚠️</a> <a href="https://github.com/formium/tsdx/issues?q=author%3Aa-type" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://sebastienlorber.com/"><img src="https://avatars0.githubusercontent.com/u/749374?v=4" width="100px;" alt=""/><br /><sub><b>Sébastien Lorber</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=slorber" title="Code">💻</a></td>
    <td align="center"><a href="https://kirjai.com"><img src="https://avatars1.githubusercontent.com/u/9858620?v=4" width="100px;" alt=""/><br /><sub><b>Kirils Ladovs</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=kirjai" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/enesTufekci"><img src="https://avatars3.githubusercontent.com/u/16020295?v=4" width="100px;" alt=""/><br /><sub><b>Enes Tüfekçi</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=enesTufekci" title="Code">💻</a> <a href="https://github.com/formium/tsdx/commits?author=enesTufekci" title="Documentation">📖</a></td>
    <td align="center"><a href="https://twitter.com/IAmTrySound"><img src="https://avatars0.githubusercontent.com/u/5635476?v=4" width="100px;" alt=""/><br /><sub><b>Bogdan Chadkin</b></sub></a><br /><a href="https://github.com/formium/tsdx/pulls?q=is%3Apr+reviewed-by%3ATrySound" title="Reviewed Pull Requests">👀</a> <a href="#question-TrySound" title="Answering Questions">💬</a> <a href="#ideas-TrySound" title="Ideas, Planning, & Feedback">🤔</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/FredyC"><img src="https://avatars0.githubusercontent.com/u/1096340?v=4" width="100px;" alt=""/><br /><sub><b>Daniel K.</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=FredyC" title="Code">💻</a> <a href="https://github.com/formium/tsdx/commits?author=FredyC" title="Documentation">📖</a> <a href="https://github.com/formium/tsdx/commits?author=FredyC" title="Tests">⚠️</a> <a href="#ideas-FredyC" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/formium/tsdx/issues?q=author%3AFredyC" title="Bug reports">🐛</a></td>
    <td align="center"><a href="http://www.quentin-sommer.com"><img src="https://avatars2.githubusercontent.com/u/9129496?v=4" width="100px;" alt=""/><br /><sub><b>Quentin Sommer</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=quentin-sommer" title="Documentation">📖</a></td>
    <td align="center"><a href="https://hyan.com.br"><img src="https://avatars3.githubusercontent.com/u/5044101?v=4" width="100px;" alt=""/><br /><sub><b>Hyan Mandian</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=hyanmandian" title="Code">💻</a> <a href="https://github.com/formium/tsdx/commits?author=hyanmandian" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://twitter.com/dance2die"><img src="https://avatars1.githubusercontent.com/u/8465237?v=4" width="100px;" alt=""/><br /><sub><b>Sung M. Kim</b></sub></a><br /><a href="https://github.com/formium/tsdx/issues?q=author%3Adance2die" title="Bug reports">🐛</a> <a href="https://github.com/formium/tsdx/commits?author=dance2die" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/johnrjj"><img src="https://avatars0.githubusercontent.com/u/1103963?v=4" width="100px;" alt=""/><br /><sub><b>John Johnson</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=johnrjj" title="Code">💻</a> <a href="https://github.com/formium/tsdx/commits?author=johnrjj" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/jooohn"><img src="https://avatars0.githubusercontent.com/u/2661835?v=4" width="100px;" alt=""/><br /><sub><b>Jun Tomioka</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=jooohn" title="Code">💻</a> <a href="https://github.com/formium/tsdx/commits?author=jooohn" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://kunst.com.br"><img src="https://avatars2.githubusercontent.com/u/8649362?v=4" width="100px;" alt=""/><br /><sub><b>Leonardo Dino</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=leonardodino" title="Code">💻</a> <a href="https://github.com/formium/tsdx/issues?q=author%3Aleonardodino" title="Bug reports">🐛</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://honzabrecka.com"><img src="https://avatars3.githubusercontent.com/u/1021827?v=4" width="100px;" alt=""/><br /><sub><b>Honza Břečka</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=honzabrecka" title="Code">💻</a> <a href="https://github.com/formium/tsdx/issues?q=author%3Ahonzabrecka" title="Bug reports">🐛</a></td>
    <td align="center"><a href="http://chatlayer.ai"><img src="https://avatars1.githubusercontent.com/u/4059732?v=4" width="100px;" alt=""/><br /><sub><b>Ward Loos</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=wrdls" title="Code">💻</a> <a href="#ideas-wrdls" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://github.com/bbugh"><img src="https://avatars3.githubusercontent.com/u/438465?v=4" width="100px;" alt=""/><br /><sub><b>Brian Bugh</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=bbugh" title="Code">💻</a> <a href="https://github.com/formium/tsdx/issues?q=author%3Abbugh" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/ccarse"><img src="https://avatars2.githubusercontent.com/u/1965943?v=4" width="100px;" alt=""/><br /><sub><b>Cody Carse</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=ccarse" title="Documentation">📖</a></td>
    <td align="center"><a href="http://sadsa.github.io"><img src="https://avatars0.githubusercontent.com/u/3200576?v=4" width="100px;" alt=""/><br /><sub><b>Josh Biddick</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=sadsa" title="Code">💻</a></td>
    <td align="center"><a href="http://albizures.com"><img src="https://avatars3.githubusercontent.com/u/6843073?v=4" width="100px;" alt=""/><br /><sub><b>Jose Albizures</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=albizures" title="Code">💻</a> <a href="https://github.com/formium/tsdx/commits?author=albizures" title="Tests">⚠️</a> <a href="https://github.com/formium/tsdx/issues?q=author%3Aalbizures" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://netzwerg.ch"><img src="https://avatars3.githubusercontent.com/u/439387?v=4" width="100px;" alt=""/><br /><sub><b>Rahel Lüthy</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=netzwerg" title="Documentation">📖</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://fabulas.io"><img src="https://avatars1.githubusercontent.com/u/14793389?v=4" width="100px;" alt=""/><br /><sub><b>Michael Edelman </b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=medelman17" title="Code">💻</a> <a href="#ideas-medelman17" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://tunnckoCore.com"><img src="https://avatars3.githubusercontent.com/u/5038030?v=4" width="100px;" alt=""/><br /><sub><b>Charlike Mike Reagent</b></sub></a><br /><a href="https://github.com/formium/tsdx/pulls?q=is%3Apr+reviewed-by%3AtunnckoCore" title="Reviewed Pull Requests">👀</a> <a href="https://github.com/formium/tsdx/commits?author=tunnckoCore" title="Code">💻</a> <a href="#ideas-tunnckoCore" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://github.com/wessberg"><img src="https://avatars0.githubusercontent.com/u/20454213?v=4" width="100px;" alt=""/><br /><sub><b>Frederik Wessberg</b></sub></a><br /><a href="#question-wessberg" title="Answering Questions">💬</a></td>
    <td align="center"><a href="http://elad.ossadon.com"><img src="https://avatars0.githubusercontent.com/u/51488?v=4" width="100px;" alt=""/><br /><sub><b>Elad Ossadon</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=elado" title="Code">💻</a> <a href="https://github.com/formium/tsdx/commits?author=elado" title="Tests">⚠️</a> <a href="https://github.com/formium/tsdx/issues?q=author%3Aelado" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/third774"><img src="https://avatars3.githubusercontent.com/u/8732191?v=4" width="100px;" alt=""/><br /><sub><b>Kevin Kipp</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=third774" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/mfolnovic"><img src="https://avatars3.githubusercontent.com/u/20919?v=4" width="100px;" alt=""/><br /><sub><b>Matija Folnovic</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=mfolnovic" title="Code">💻</a> <a href="https://github.com/formium/tsdx/commits?author=mfolnovic" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/Aidurber"><img src="https://avatars1.githubusercontent.com/u/5732291?v=4" width="100px;" alt=""/><br /><sub><b>Andrew</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=Aidurber" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="http://audiolion.github.io"><img src="https://avatars1.githubusercontent.com/u/2430381?v=4" width="100px;" alt=""/><br /><sub><b>Ryan Castner</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=audiolion" title="Code">💻</a> <a href="https://github.com/formium/tsdx/commits?author=audiolion" title="Tests">⚠️</a> <a href="#ideas-audiolion" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://github.com/yordis"><img src="https://avatars0.githubusercontent.com/u/4237280?v=4" width="100px;" alt=""/><br /><sub><b>Yordis Prieto</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=yordis" title="Code">💻</a></td>
    <td align="center"><a href="http://www.ncphi.com"><img src="https://avatars2.githubusercontent.com/u/824015?v=4" width="100px;" alt=""/><br /><sub><b>NCPhillips</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=ncphillips" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/ArnaudBarre"><img src="https://avatars1.githubusercontent.com/u/14235743?v=4" width="100px;" alt=""/><br /><sub><b>Arnaud Barré</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=ArnaudBarre" title="Code">💻</a> <a href="https://github.com/formium/tsdx/commits?author=ArnaudBarre" title="Documentation">📖</a></td>
    <td align="center"><a href="http://twitter.com/techieshark"><img src="https://avatars2.githubusercontent.com/u/1072292?v=4" width="100px;" alt=""/><br /><sub><b>Peter W</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=techieshark" title="Documentation">📖</a></td>
    <td align="center"><a href="http://joeflateau.net"><img src="https://avatars0.githubusercontent.com/u/643331?v=4" width="100px;" alt=""/><br /><sub><b>Joe Flateau</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=joeflateau" title="Code">💻</a> <a href="https://github.com/formium/tsdx/commits?author=joeflateau" title="Documentation">📖</a></td>
    <td align="center"><a href="http://goznauk.github.io"><img src="https://avatars0.githubusercontent.com/u/4438903?v=4" width="100px;" alt=""/><br /><sub><b>H.John Choi</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=goznauk" title="Documentation">📖</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://brave.com/loo095"><img src="https://avatars0.githubusercontent.com/u/85355?v=4" width="100px;" alt=""/><br /><sub><b>Jon Stevens</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=lookfirst" title="Documentation">📖</a> <a href="#ideas-lookfirst" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/formium/tsdx/issues?q=author%3Alookfirst" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/apps/greenkeeper"><img src="https://avatars3.githubusercontent.com/in/505?v=4" width="100px;" alt=""/><br /><sub><b>greenkeeper[bot]</b></sub></a><br /><a href="#infra-greenkeeper[bot]" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="https://github.com/formium/tsdx/commits?author=greenkeeper[bot]" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/apps/allcontributors"><img src="https://avatars0.githubusercontent.com/in/23186?v=4" width="100px;" alt=""/><br /><sub><b>allcontributors[bot]</b></sub></a><br /><a href="#infra-allcontributors[bot]" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="https://github.com/formium/tsdx/commits?author=allcontributors[bot]" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/apps/dependabot"><img src="https://avatars0.githubusercontent.com/in/29110?v=4" width="100px;" alt=""/><br /><sub><b>dependabot[bot]</b></sub></a><br /><a href="#infra-dependabot[bot]" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a> <a href="#security-dependabot[bot]" title="Security">🛡️</a> <a href="https://github.com/formium/tsdx/commits?author=dependabot[bot]" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/about"><img src="https://avatars1.githubusercontent.com/u/9919?v=4" width="100px;" alt=""/><br /><sub><b>GitHub</b></sub></a><br /><a href="#infra-github" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
    <td align="center"><a href="http://linkedin.com/in/ambroseus"><img src="https://avatars0.githubusercontent.com/u/380645?v=4" width="100px;" alt=""/><br /><sub><b>Eugene Samonenko</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=ambroseus" title="Tests">⚠️</a> <a href="#example-ambroseus" title="Examples">💡</a> <a href="#question-ambroseus" title="Answering Questions">💬</a> <a href="#ideas-ambroseus" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://github.com/rockmandash"><img src="https://avatars2.githubusercontent.com/u/7580792?v=4" width="100px;" alt=""/><br /><sub><b>Joseph Wang</b></sub></a><br /><a href="https://github.com/formium/tsdx/issues?q=author%3Arockmandash" title="Bug reports">🐛</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://qiita.com/kotarella1110"><img src="https://avatars1.githubusercontent.com/u/12913947?v=4" width="100px;" alt=""/><br /><sub><b>Kotaro Sugawara</b></sub></a><br /><a href="https://github.com/formium/tsdx/issues?q=author%3Akotarella1110" title="Bug reports">🐛</a> <a href="https://github.com/formium/tsdx/commits?author=kotarella1110" title="Code">💻</a></td>
    <td align="center"><a href="https://blog.semesse.me"><img src="https://avatars1.githubusercontent.com/u/13726406?v=4" width="100px;" alt=""/><br /><sub><b>Semesse</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=Semperia" title="Code">💻</a></td>
    <td align="center"><a href="https://informatikamihelac.com"><img src="https://avatars0.githubusercontent.com/u/13813?v=4" width="100px;" alt=""/><br /><sub><b>Bojan Mihelac</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=bmihelac" title="Code">💻</a></td>
    <td align="center"><a href="https://dandascalescu.com/"><img src="https://avatars3.githubusercontent.com/u/33569?v=4" width="100px;" alt=""/><br /><sub><b>Dan Dascalescu</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=dandv" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/yuriy636"><img src="https://avatars3.githubusercontent.com/u/6631050?v=4" width="100px;" alt=""/><br /><sub><b>Yuriy Burychka</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=yuriy636" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/jssee"><img src="https://avatars1.githubusercontent.com/u/2642936?v=4" width="100px;" alt=""/><br /><sub><b>Jesse Hoyos</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=jssee" title="Code">💻</a></td>
    <td align="center"><a href="https://twitter.com/devrelm"><img src="https://avatars0.githubusercontent.com/u/2008333?v=4" width="100px;" alt=""/><br /><sub><b>Mike Deverell</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=devrelm" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://hipsterbrown.com"><img src="https://avatars3.githubusercontent.com/u/3051193?v=4" width="100px;" alt=""/><br /><sub><b>Nick Hehr</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=HipsterBrown" title="Code">💻</a> <a href="https://github.com/formium/tsdx/commits?author=HipsterBrown" title="Documentation">📖</a> <a href="#example-HipsterBrown" title="Examples">💡</a></td>
    <td align="center"><a href="https://github.com/Bnaya"><img src="https://avatars0.githubusercontent.com/u/1304862?v=4" width="100px;" alt=""/><br /><sub><b>Bnaya Peretz</b></sub></a><br /><a href="https://github.com/formium/tsdx/issues?q=author%3ABnaya" title="Bug reports">🐛</a> <a href="https://github.com/formium/tsdx/commits?author=Bnaya" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/andresz1"><img src="https://avatars2.githubusercontent.com/u/6877967?v=4" width="100px;" alt=""/><br /><sub><b>Andres Alvarez</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=andresz1" title="Code">💻</a> <a href="https://github.com/formium/tsdx/commits?author=andresz1" title="Documentation">📖</a> <a href="#example-andresz1" title="Examples">💡</a></td>
    <td align="center"><a href="https://github.com/kyarik"><img src="https://avatars2.githubusercontent.com/u/33955898?v=4" width="100px;" alt=""/><br /><sub><b>Yaroslav K.</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=kyarik" title="Documentation">📖</a></td>
    <td align="center"><a href="https://strdr4605.github.io"><img src="https://avatars3.githubusercontent.com/u/16056918?v=4" width="100px;" alt=""/><br /><sub><b>Dragoș Străinu</b></sub></a><br /><a href="#ideas-strdr4605" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://www.linkedin.com/in/george-varghese-m/"><img src="https://avatars1.githubusercontent.com/u/20477438?v=4" width="100px;" alt=""/><br /><sub><b>George Varghese M.</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=georgevarghese185" title="Code">💻</a> <a href="https://github.com/formium/tsdx/commits?author=georgevarghese185" title="Documentation">📖</a> <a href="https://github.com/formium/tsdx/commits?author=georgevarghese185" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://nelabs.dev/"><img src="https://avatars2.githubusercontent.com/u/137872?v=4" width="100px;" alt=""/><br /><sub><b>Reinis Ivanovs</b></sub></a><br /><a href="#ideas-slikts" title="Ideas, Planning, & Feedback">🤔</a> <a href="#question-slikts" title="Answering Questions">💬</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://orta.io"><img src="https://avatars2.githubusercontent.com/u/49038?v=4" width="100px;" alt=""/><br /><sub><b>Orta Therox</b></sub></a><br /><a href="#question-orta" title="Answering Questions">💬</a> <a href="https://github.com/formium/tsdx/commits?author=orta" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/thany"><img src="https://avatars1.githubusercontent.com/u/152227?v=4" width="100px;" alt=""/><br /><sub><b>Martijn Saly</b></sub></a><br /><a href="https://github.com/formium/tsdx/issues?q=author%3Athany" title="Bug reports">🐛</a></td>
    <td align="center"><a href="http://kattcorp.com"><img src="https://avatars1.githubusercontent.com/u/459267?v=4" width="100px;" alt=""/><br /><sub><b>Alex Johansson</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=KATT" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/hb-seb"><img src="https://avatars1.githubusercontent.com/u/69623566?v=4" width="100px;" alt=""/><br /><sub><b>hb-seb</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=hb-seb" title="Code">💻</a></td>
    <td align="center"><a href="http://seungdols.tistory.com/"><img src="https://avatars3.githubusercontent.com/u/16032614?v=4" width="100px;" alt=""/><br /><sub><b>seungdols</b></sub></a><br /><a href="https://github.com/formium/tsdx/issues?q=author%3Aseungdols" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/CyriacBr"><img src="https://avatars3.githubusercontent.com/u/38442110?v=4" width="100px;" alt=""/><br /><sub><b>Béré Cyriac</b></sub></a><br /><a href="https://github.com/formium/tsdx/issues?q=author%3ACyriacBr" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/in19farkt"><img src="https://avatars3.githubusercontent.com/u/12945918?v=4" width="100px;" alt=""/><br /><sub><b>Dmitriy Serdtsev</b></sub></a><br /><a href="https://github.com/formium/tsdx/issues?q=author%3Ain19farkt" title="Bug reports">🐛</a></td>
  </tr>
  <tr>
    <td align="center"><a href="http://formoses.ru/"><img src="https://avatars3.githubusercontent.com/u/3105477?v=4" width="100px;" alt=""/><br /><sub><b>Vladislav Moiseev</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=vladdy-moses" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/felixmosh"><img src="https://avatars3.githubusercontent.com/u/9304194?v=4" width="100px;" alt=""/><br /><sub><b>Felix Mosheev</b></sub></a><br /><a href="https://github.com/formium/tsdx/issues?q=author%3Afelixmosh" title="Bug reports">🐛</a> <a href="https://github.com/formium/tsdx/commits?author=felixmosh" title="Documentation">📖</a></td>
    <td align="center"><a href="http://www.ludofischer.com"><img src="https://avatars1.githubusercontent.com/u/43557?v=4" width="100px;" alt=""/><br /><sub><b>Ludovico Fischer</b></sub></a><br /><a href="https://github.com/formium/tsdx/commits?author=ludofischer" title="Code">💻</a></td>
    <td align="center"><a href="http://www.altrimbeqiri.com"><img src="https://avatars0.githubusercontent.com/u/602300?v=4" width="100px;" alt=""/><br /><sub><b>Altrim Beqiri</b></sub></a><br /><a href="https://github.com/formium/tsdx/issues?q=author%3Aaltrim" title="Bug reports">🐛</a> <a href="https://github.com/formium/tsdx/commits?author=altrim" title="Code">💻</a> <a href="https://github.com/formium/tsdx/commits?author=altrim" title="Tests">⚠️</a></td>
    <td align="center"><a href="https://github.com/tanem"><img src="https://avatars3.githubusercontent.com/u/464864?v=4" width="100px;" alt=""/><br /><sub><b>Tane Morgan</b></sub></a><br /><a href="https://github.com/formium/tsdx/issues?q=author%3Atanem" title="Bug reports">🐛</a> <a href="https://github.com/formium/tsdx/commits?author=tanem" title="Code">💻</a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
