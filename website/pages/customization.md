# Customization

## Rollup

> **❗⚠️❗ Warning**: <br/>
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
export interface TSDXOptions {
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

### Example: Adding Postcss

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

## Babel

You can add your own `.babelrc` to the root of your project and TSDX will **merge** it with [its own Babel transforms](./src/babelPluginTSDX.ts) (which are mostly for optimization), putting any new presets and plugins at the end of its list.

## Jest

You can add your own `jest.config.js` to the root of your project and TSDX will **shallow merge** it with [its own Jest config](./src/createJestConfig.ts).

## ESLint

You can add your own `.eslintrc.js` to the root of your project and TSDX will **deep merge** it with [its own ESLint config](./src/createEslintConfig.ts).
