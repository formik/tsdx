import * as fs from 'fs-extra';
import { concatAllArray } from 'jpjs';

import { paths } from './constants';
import {
  TSDXConfig,
  TSDXOptions,
  AtLeastOneTSDXOptions,
  NormalizedOpts,
  RollupOptionsWithOutput,
} from './types';

import { createRollupConfig } from './createRollupConfig';

// check for custom tsdx.config.js
let tsdxConfig: TSDXConfig = {
  rollup(config, _options) {
    return config;
  },
};

if (fs.existsSync(paths.appConfig)) {
  tsdxConfig = require(paths.appConfig);
}

export async function createBuildConfigs(
  opts: NormalizedOpts
): Promise<RollupOptionsWithOutput[]> {
  const allInputs = concatAllArray(
    opts.input.map((input: string) =>
      createAllFormats(opts, input).map(
        (options: TSDXOptions, index: number) => ({
          ...options,
          // We want to know if this is the first run for each entryfile
          // for certain plugins (e.g. css)
          writeMeta: index === 0,
        })
      )
    )
  );

  return await Promise.all(
    allInputs.map(async (options: TSDXOptions, index: number) => {
      // pass the full rollup config to tsdx.config.js override
      const config = await createRollupConfig(options, index);
      return tsdxConfig.rollup(config, options);
    })
  );
}

function createAllFormats(
  opts: NormalizedOpts,
  input: string
): AtLeastOneTSDXOptions {
  return [
    opts.format.includes('cjs') && {
      ...opts,
      format: 'cjs',
      env: 'development',
      input,
    },
    opts.format.includes('cjs') && {
      ...opts,
      format: 'cjs',
      env: 'production',
      input,
    },
    opts.format.includes('esm') && { ...opts, format: 'esm', input },
    opts.format.includes('umd') && {
      ...opts,
      format: 'umd',
      env: 'development',
      input,
    },
    opts.format.includes('umd') && {
      ...opts,
      format: 'umd',
      env: 'production',
      input,
    },
    opts.format.includes('system') && {
      ...opts,
      format: 'system',
      env: 'development',
      input,
    },
    opts.format.includes('system') && {
      ...opts,
      format: 'system',
      env: 'production',
      input,
    },
  ].filter(Boolean) as AtLeastOneTSDXOptions;
}
