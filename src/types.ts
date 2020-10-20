import { RollupOptions, OutputOptions } from 'rollup';

interface SharedOpts {
  // JS target
  target: 'node' | 'browser';
  // Path to tsconfig file
  tsconfig?: string;
  // Is error extraction running?
  extractErrors?: boolean;
}

export type ModuleFormat = 'cjs' | 'umd' | 'esm' | 'system';
export type AtLeastOneModuleFormat = [ModuleFormat, ...ModuleFormat[]];

export interface BuildOpts extends SharedOpts {
  name?: string;
  entry?: string | string[];
  format: 'cjs,esm';
  target: 'browser';
}

export interface WatchOpts extends BuildOpts {
  verbose?: boolean;
  noClean?: boolean;
  // callback hooks
  onFirstSuccess?: string;
  onSuccess?: string;
  onFailure?: string;
}

export interface NormalizedOpts
  extends Omit<WatchOpts, 'name' | 'input' | 'format'> {
  name: string;
  input: string[];
  format: AtLeastOneModuleFormat;
}

export interface TSDXOptions extends SharedOpts {
  // Name of package
  name: string;
  // path to file
  input: string;
  // Environment
  env: 'development' | 'production';
  // Module format
  format: ModuleFormat;
  // Is minifying?
  minify?: boolean;
  // Is this the very first rollup config (and thus should one-off metadata be extracted)?
  writeMeta?: boolean;
  // Only transpile, do not type check (makes compilation faster)
  transpileOnly?: boolean;
}
export type AtLeastOneTSDXOptions = [TSDXOptions, ...TSDXOptions[]];

export interface PackageJson {
  name: string;
  source?: string;
  jest?: any;
  eslint?: any;
  dependencies?: { [packageName: string]: string };
  devDependencies?: { [packageName: string]: string };
  engines?: {
    node?: string;
  };
}

export type RollupOptionsWithOutput = RollupOptions & { output: OutputOptions };

export interface TSDXConfig {
  rollup: (config: RollupOptions, options: TSDXOptions) => RollupOptions;
}
