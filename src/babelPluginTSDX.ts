import { createConfigItem } from '@babel/core';
import {
  createBabelInputPluginFactory,
  RollupBabelInputPluginOptions,
} from '@rollup/plugin-babel';
import { Plugin } from 'rollup';
import merge from 'lodash.merge';

export const isTruthy = (obj?: any) => {
  if (!obj) {
    return false;
  }

  return obj.constructor !== Object || Object.keys(obj).length > 0;
};

// replace lodash with lodash-es, but not lodash/fp
const replacements = [{ original: 'lodash(?!/fp)', replacement: 'lodash-es' }];

export const mergeConfigItems = (type: any, ...configItemsToMerge: any[]) => {
  const mergedItems: any[] = [];

  configItemsToMerge.forEach(configItemToMerge => {
    configItemToMerge.forEach((item: any) => {
      const itemToMergeWithIndex = mergedItems.findIndex(
        mergedItem => mergedItem.file.resolved === item.file.resolved
      );

      if (itemToMergeWithIndex === -1) {
        mergedItems.push(item);
        return;
      }

      mergedItems[itemToMergeWithIndex] = createConfigItem(
        [
          mergedItems[itemToMergeWithIndex].file.resolved,
          merge(mergedItems[itemToMergeWithIndex].options, item.options),
        ],
        {
          type,
        }
      );
    });
  });

  return mergedItems;
};

export const createConfigItems = (type: any, items: any[]) => {
  return items.map(({ name, ...options }) => {
    return createConfigItem([require.resolve(name), options], { type });
  });
};

// augment with `custom` since it's added in `options` below
type IBabelPluginTSDX = (
  options: RollupBabelInputPluginOptions & {
    custom: any;
    // not sure if @types/babel__core is incorrect or this is actually ignored
    passPerPreset: boolean;
  }
) => Plugin;

// temp workaround so prettier doesn't reformat 100 lines for indentation
const shortBabelPlugin = createBabelInputPluginFactory;

export const babelPluginTSDX: IBabelPluginTSDX = shortBabelPlugin(() => ({
  // Passed the plugin options.
  options({ custom: customOptions, ...pluginOptions }: any) {
    return {
      // Pull out any custom options that the plugin might have.
      customOptions,

      // Pass the options back with the two custom options removed.
      pluginOptions,
    };
  },
  config(config: any, { customOptions }: any) {
    const defaultPlugins = createConfigItems(
      'plugin',
      [
        // {
        //   name: '@babel/plugin-transform-react-jsx',
        //   pragma: customOptions.jsx || 'h',
        //   pragmaFrag: customOptions.jsxFragment || 'Fragment',
        // },
        { name: 'babel-plugin-macros' },
        { name: 'babel-plugin-annotate-pure-calls' },
        { name: 'babel-plugin-dev-expression' },
        customOptions.format !== 'cjs' && {
          name: 'babel-plugin-transform-rename-import',
          replacements,
        },
        {
          name: 'babel-plugin-polyfill-regenerator',
          // don't pollute global env as this is being used in a library
          method: 'usage-pure',
        },
        {
          name: '@babel/plugin-proposal-class-properties',
          loose: true,
        },
        isTruthy(customOptions.extractErrors) && {
          name: './errors/transformErrorMessages',
        },
      ].filter(Boolean)
    );

    const babelOptions = config.options || {};
    babelOptions.presets = babelOptions.presets || [];

    const presetEnvIdx = babelOptions.presets.findIndex((preset: any) =>
      preset.file.request.includes('@babel/preset-env')
    );

    // if they use preset-env, merge their options with ours
    if (presetEnvIdx !== -1) {
      const presetEnv = babelOptions.presets[presetEnvIdx];
      babelOptions.presets[presetEnvIdx] = createConfigItem(
        [
          presetEnv.file.resolved,
          merge(
            {
              loose: true,
              targets: customOptions.targets,
            },
            presetEnv.options,
            {
              modules: false,
            }
          ),
        ],
        {
          type: `preset`,
        }
      );
    } else {
      // if no preset-env, add it & merge with their presets
      const defaultPresets = createConfigItems('preset', [
        {
          name: '@babel/preset-env',
          targets: customOptions.targets,
          modules: false,
          loose: true,
        },
      ]);

      babelOptions.presets = mergeConfigItems(
        'preset',
        defaultPresets,
        babelOptions.presets
      );
    }

    // Merge babelrc & our plugins together
    babelOptions.plugins = mergeConfigItems(
      'plugin',
      defaultPlugins,
      babelOptions.plugins || []
    );

    return babelOptions;
  },
}));
