#!/usr/bin/env node

import sade from 'sade';
import glob from 'tiny-glob/sync';
import {
  rollup,
  watch,
  RollupOptions,
  OutputOptions,
  RollupWatchOptions,
  WatcherOptions,
} from 'rollup';
import asyncro from 'asyncro';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as jest from 'jest';
import { CLIEngine } from 'eslint';
import logError from './logError';
import path from 'path';
import execa from 'execa';
import shell from 'shelljs';
import ora from 'ora';
import semver from 'semver';
import { paths } from './constants';
import * as Messages from './messages';
import { createBuildConfigs } from './createBuildConfigs';
import { createJestConfig, JestConfigOptions } from './createJestConfig';
import { createEslintConfig } from './createEslintConfig';
import {
  resolveApp,
  safePackageName,
  clearConsole,
  getNodeEngineRequirement,
} from './utils';
import { concatAllArray } from 'jpjs';
import getInstallCmd from './getInstallCmd';
import getInstallArgs from './getInstallArgs';
import { Input, Select } from 'enquirer';
import {
  PackageJson,
  WatchOpts,
  BuildOpts,
  ModuleFormat,
  NormalizedOpts,
} from './types';
import { createProgressEstimator } from './createProgressEstimator';
import { templates } from './templates';
import { composePackageJson } from './templates/utils';
import * as deprecated from './deprecated';
const pkg = require('../package.json');

const prog = sade('tsdx');

let appPackageJson: PackageJson;

try {
  appPackageJson = fs.readJSONSync(paths.appPackageJson);
} catch (e) { }

export const isDir = (name: string) =>
  fs
    .stat(name)
    .then(stats => stats.isDirectory())
    .catch(() => false);

export const isFile = (name: string) =>
  fs
    .stat(name)
    .then(stats => stats.isFile())
    .catch(() => false);

async function jsOrTs(filename: string) {
  const extension = (await isFile(resolveApp(filename + '.ts')))
    ? '.ts'
    : (await isFile(resolveApp(filename + '.tsx')))
      ? '.tsx'
      : (await isFile(resolveApp(filename + '.jsx')))
        ? '.jsx'
        : '.js';

  return resolveApp(`${filename}${extension}`);
}

async function getInputs(
  entries?: string | string[],
  source?: string
): Promise<string[]> {
  return concatAllArray(
    ([] as any[])
      .concat(
        entries && entries.length
          ? entries
          : (source && resolveApp(source)) ||
          ((await isDir(resolveApp('src'))) && (await jsOrTs('src/index')))
      )
      .map(file => glob(file))
  );
}

prog
  .version(pkg.version)
  .command('create <pkg>')
  .describe('Create a new package with TSDX')
  .example('create mypackage')
  .option(
    '--template',
    `Specify a template. Allowed choices: [${Object.keys(templates).join(
      ', '
    )}]`
  )
  .example('create --template react mypackage')
  .action(async (pkg: string, opts: any) => {
    console.log(
      chalk.blue(`
::::::::::: ::::::::  :::::::::  :::    :::
    :+:    :+:    :+: :+:    :+: :+:    :+:
    +:+    +:+        +:+    +:+  +:+  +:+
    +#+    +#++:++#++ +#+    +:+   +#++:+
    +#+           +#+ +#+    +#+  +#+  +#+
    #+#    #+#    #+# #+#    #+# #+#    #+#
    ###     ########  #########  ###    ###
`)
    );
    const bootSpinner = ora(`Creating ${chalk.bold.green(pkg)}...`);
    let template;
    // Helper fn to prompt the user for a different
    // folder name if one already exists
    async function getProjectPath(projectPath: string): Promise<string> {
      const exists = await fs.pathExists(projectPath);
      if (!exists) {
        return projectPath;
      }

      bootSpinner.fail(`Failed to create ${chalk.bold.red(pkg)}`);
      const prompt = new Input({
        message: `A folder named ${chalk.bold.red(
          pkg
        )} already exists! ${chalk.bold('Choose a different name')}`,
        initial: pkg + '-1',
        result: (v: string) => v.trim(),
      });

      pkg = await prompt.run();
      projectPath = (await fs.realpath(process.cwd())) + '/' + pkg;
      bootSpinner.start(`Creating ${chalk.bold.green(pkg)}...`);
      return await getProjectPath(projectPath); // recursion!
    }

    try {
      // get the project path
      const realPath = await fs.realpath(process.cwd());
      let projectPath = await getProjectPath(realPath + '/' + pkg);

      const prompt = new Select({
        message: 'Choose a template',
        choices: Object.keys(templates),
      });

      if (opts.template) {
        template = opts.template.trim();
        if (!prompt.choices.includes(template)) {
          bootSpinner.fail(`Invalid template ${chalk.bold.red(template)}`);
          template = await prompt.run();
        }
      } else {
        template = await prompt.run();
      }

      bootSpinner.start();
      // copy the template
      await fs.copy(
        path.resolve(__dirname, `../templates/${template}`),
        projectPath,
        {
          overwrite: true,
        }
      );
      // fix gitignore
      await fs.move(
        path.resolve(projectPath, './gitignore'),
        path.resolve(projectPath, './.gitignore')
      );

      // update license year and author
      let license: string = await fs.readFile(
        path.resolve(projectPath, 'LICENSE'),
        { encoding: 'utf-8' }
      );

      license = license.replace(/<year>/, `${new Date().getFullYear()}`);

      // attempt to automatically derive author name
      let author = getAuthorName();

      if (!author) {
        bootSpinner.stop();
        const licenseInput = new Input({
          name: 'author',
          message: 'Who is the package author?',
        });
        author = await licenseInput.run();
        setAuthorName(author);
        bootSpinner.start();
      }

      license = license.replace(/<author>/, author.trim());

      await fs.writeFile(path.resolve(projectPath, 'LICENSE'), license, {
        encoding: 'utf-8',
      });

      const templateConfig = templates[template as keyof typeof templates];
      const generatePackageJson = composePackageJson(templateConfig);

      // Install deps
      process.chdir(projectPath);
      const safeName = safePackageName(pkg);
      const pkgJson = generatePackageJson({ name: safeName, author });

      const nodeVersionReq = getNodeEngineRequirement(pkgJson);
      if (
        nodeVersionReq &&
        !semver.satisfies(process.version, nodeVersionReq)
      ) {
        bootSpinner.fail(Messages.incorrectNodeVersion(nodeVersionReq));
        process.exit(1);
      }

      await fs.outputJSON(path.resolve(projectPath, 'package.json'), pkgJson);
      bootSpinner.succeed(`Created ${chalk.bold.green(pkg)}`);
      await Messages.start(pkg);
    } catch (error) {
      bootSpinner.fail(`Failed to create ${chalk.bold.red(pkg)}`);
      logError(error);
      process.exit(1);
    }

    const templateConfig = templates[template as keyof typeof templates];
    const { dependencies: deps } = templateConfig;

    const installSpinner = ora(Messages.installing(deps.sort())).start();
    try {
      const cmd = await getInstallCmd();
      await execa(cmd, getInstallArgs(cmd, deps));
      installSpinner.succeed('Installed dependencies');
      console.log(await Messages.start(pkg));
    } catch (error) {
      installSpinner.fail('Failed to install dependencies');
      logError(error);
      process.exit(1);
    }
  });

prog
  .command('watch')
  .describe('Rebuilds on any change')
  .option('--entry, -i', 'Entry module')
  .example('watch --entry src/foo.tsx')
  .option('--target', 'Specify your target environment', 'browser')
  .example('watch --target node')
  .option('--name', 'Specify name exposed in UMD builds')
  .example('watch --name Foo')
  .option('--format', 'Specify module format(s)', 'cjs,esm')
  .example('watch --format cjs,esm')
  .option(
    '--verbose',
    'Keep outdated console output in watch mode instead of clearing the screen'
  )
  .example('watch --verbose')
  .option('--noClean', "Don't clean the dist folder")
  .example('watch --noClean')
  .option('--tsconfig', 'Specify custom tsconfig path')
  .example('watch --tsconfig ./tsconfig.foo.json')
  .option('--onFirstSuccess', 'Run a command on the first successful build')
  .example('watch --onFirstSuccess "echo The first successful build!"')
  .option('--onSuccess', 'Run a command on a successful build')
  .example('watch --onSuccess "echo Successful build!"')
  .option('--onFailure', 'Run a command on a failed build')
  .example('watch --onFailure "The build failed!"')
  .option('--transpileOnly', 'Skip type checking')
  .example('watch --transpileOnly')
  .option('--extractErrors', 'Extract invariant errors to ./errors/codes.json.')
  .example('watch --extractErrors')
  .action(async (dirtyOpts: WatchOpts) => {
    const opts = await normalizeOpts(dirtyOpts);
    const buildConfigs = await createBuildConfigs(opts);
    if (!opts.noClean) {
      await cleanDistFolder();
    }
    if (opts.format.includes('cjs')) {
      await writeCjsEntryFile(opts.name);
    }
    if (opts.format.includes('esm')) {
      await writeMjsEntryFile(opts.name);
    }

    type Killer = execa.ExecaChildProcess | null;

    let firstTime = true;
    let successKiller: Killer = null;
    let failureKiller: Killer = null;

    function run(command?: string) {
      if (!command) {
        return null;
      }

      const [exec, ...args] = command.split(' ');
      return execa(exec, args, {
        stdio: 'inherit',
      });
    }

    function killHooks() {
      return Promise.all([
        successKiller ? successKiller.kill('SIGTERM') : null,
        failureKiller ? failureKiller.kill('SIGTERM') : null,
      ]);
    }

    const spinner = ora().start();
    watch(
      (buildConfigs as RollupWatchOptions[]).map(inputOptions => ({
        watch: {
          silent: true,
          include: ['src/**'],
          exclude: ['node_modules/**'],
        } as WatcherOptions,
        ...inputOptions,
      }))
    ).on('event', async event => {
      // clear previous onSuccess/onFailure hook processes so they don't pile up
      await killHooks();

      if (event.code === 'START') {
        if (!opts.verbose) {
          clearConsole();
        }
        spinner.start(chalk.bold.cyan('Compiling modules...'));
      }
      if (event.code === 'ERROR') {
        spinner.fail(chalk.bold.red('Failed to compile'));
        logError(event.error);
        failureKiller = run(opts.onFailure);
      }
      if (event.code === 'END') {
        spinner.succeed(chalk.bold.green('Compiled successfully'));
        console.log(`
  ${chalk.dim('Watching for changes')}
`);

        try {
          await deprecated.moveTypes();

          if (firstTime && opts.onFirstSuccess) {
            firstTime = false;
            run(opts.onFirstSuccess);
          } else {
            successKiller = run(opts.onSuccess);
          }
        } catch (_error) { }
      }
    });
  });

prog
  .command('build')
  .describe('Build your project once and exit')
  .option('--entry, -i', 'Entry module')
  .example('build --entry src/foo.tsx')
  .option('--target', 'Specify your target environment', 'browser')
  .example('build --target node')
  .option('--name', 'Specify name exposed in UMD builds')
  .example('build --name Foo')
  .option('--format', 'Specify module format(s)', 'cjs,esm')
  .example('build --format cjs,esm')
  .option('--legacy', 'Babel transpile and emit ES5.')
  .example('build --legacy')
  .option('--tsconfig', 'Specify custom tsconfig path')
  .example('build --tsconfig ./tsconfig.foo.json')
  .option('--transpileOnly', 'Skip type checking')
  .example('build --transpileOnly')
  .option(
    '--extractErrors',
    'Extract errors to ./errors/codes.json and provide a url for decoding.'
  )
  .example(
    'build --extractErrors=https://reactjs.org/docs/error-decoder.html?invariant='
  )
  .action(async (dirtyOpts: BuildOpts) => {
    const opts = await normalizeOpts(dirtyOpts);
    const buildConfigs = await createBuildConfigs(opts);
    await cleanDistFolder();
    const logger = await createProgressEstimator();
    if (opts.format.includes('cjs')) {
      const promise = writeCjsEntryFile(opts.name).catch(logError);
      logger(promise, 'Creating CJS entry file');
    }
    if (opts.format.includes('esm')) {
      const promise = writeMjsEntryFile(opts.name).catch(logError);
      logger(promise, 'Creating MJS entry file');
    }
    try {
      const promise = asyncro
        .map(
          buildConfigs,
          async (inputOptions: RollupOptions & { output: OutputOptions }) => {
            let bundle = await rollup(inputOptions);
            await bundle.write(inputOptions.output);
          }
        )
        .catch((e: any) => {
          throw e;
        })
        .then(async () => {
          await deprecated.moveTypes();
        });
      logger(promise, 'Building modules');
      await promise;
    } catch (error) {
      logError(error);
      process.exit(1);
    }
  });

async function normalizeOpts(opts: WatchOpts): Promise<NormalizedOpts> {
  return {
    ...opts,
    name: opts.name || appPackageJson.name,
    input: await getInputs(opts.entry, appPackageJson.source),
    format: opts.format.split(',').map((format: string) => {
      if (format === 'es') {
        return 'esm';
      }
      return format;
    }) as [ModuleFormat, ...ModuleFormat[]],
  };
}

async function cleanDistFolder() {
  await fs.remove(paths.appDist);
}

function writeCjsEntryFile(name: string) {
  const baseLine = `module.exports = require('./${safePackageName(name)}`;
  const contents = `
'use strict'

if (process.env.NODE_ENV === 'production') {
  ${baseLine}.production.min.cjs')
} else {
  ${baseLine}.development.cjs')
}
`;
  return fs.outputFile(path.join(paths.appDist, 'index.cjs'), contents);
}

function writeMjsEntryFile(name: string) {
  const contents = `
export { default } from './${name}.min.mjs';
export * from './${name}.min.mjs';
  `;
  return fs.outputFile(path.join(paths.appDist, 'index.mjs'), contents);
}

function getAuthorName() {
  let author = '';

  author = shell
    .exec('npm config get init-author-name', { silent: true })
    .stdout.trim();
  if (author) return author;

  author = shell
    .exec('git config --global user.name', { silent: true })
    .stdout.trim();
  if (author) {
    setAuthorName(author);
    return author;
  }

  author = shell
    .exec('npm config get init-author-email', { silent: true })
    .stdout.trim();
  if (author) return author;

  author = shell
    .exec('git config --global user.email', { silent: true })
    .stdout.trim();
  if (author) return author;

  return author;
}

function setAuthorName(author: string) {
  shell.exec(`npm config set init-author-name "${author}"`, { silent: true });
}

prog
  .command('test')
  .describe('Run jest test runner. Passes through all flags directly to Jest')
  .action(async (opts: { config?: string }) => {
    // Do this as the first thing so that any code reading it knows the right env.
    process.env.BABEL_ENV = 'test';
    process.env.NODE_ENV = 'test';
    // Makes the script crash on unhandled rejections instead of silently
    // ignoring them. In the future, promise rejections that are not handled will
    // terminate the Node.js process with a non-zero exit code.
    process.on('unhandledRejection', err => {
      throw err;
    });

    const argv = process.argv.slice(2);
    let jestConfig: JestConfigOptions = {
      ...createJestConfig(
        relativePath => path.resolve(__dirname, '..', relativePath),
        opts.config ? path.dirname(opts.config) : paths.appRoot
      ),
      ...appPackageJson.jest,
      passWithNoTests: true,
    };

    // Allow overriding with jest.config
    const defaultPathExists = await fs.pathExists(paths.jestConfig);
    if (opts.config || defaultPathExists) {
      const jestConfigPath = resolveApp(opts.config || paths.jestConfig);
      const jestConfigContents: JestConfigOptions = require(jestConfigPath);
      jestConfig = { ...jestConfig, ...jestConfigContents };
    }

    // if custom path, delete the arg as it's already been merged
    if (opts.config) {
      let configIndex = argv.indexOf('--config');
      if (configIndex !== -1) {
        // case of "--config path", delete both args
        argv.splice(configIndex, 2);
      } else {
        // case of "--config=path", only one arg to delete
        const configRegex = /--config=.+/;
        configIndex = argv.findIndex(arg => arg.match(configRegex));
        if (configIndex !== -1) {
          argv.splice(configIndex, 1);
        }
      }
    }

    argv.push(
      '--config',
      JSON.stringify({
        ...jestConfig,
      })
    );

    const [, ...argsToPassToJestCli] = argv;
    jest.run(argsToPassToJestCli);
  });

prog
  .command('lint')
  .describe('Run eslint with Prettier')
  .example('lint src test')
  .option('--fix', 'Fixes fixable errors and warnings')
  .example('lint src test --fix')
  .option('--ignore-pattern', 'Ignore a pattern')
  .example('lint src test --ignore-pattern test/foobar.ts')
  .option(
    '--max-warnings',
    'Exits with non-zero error code if number of warnings exceed this number',
    Infinity
  )
  .example('lint src test --max-warnings 10')
  .option('--write-file', 'Write the config file locally')
  .example('lint --write-file')
  .option('--report-file', 'Write JSON report to file locally')
  .example('lint --report-file eslint-report.json')
  .action(
    async (opts: {
      fix: boolean;
      'ignore-pattern': string;
      'write-file': boolean;
      'report-file': string;
      'max-warnings': number;
      _: string[];
    }) => {
      if (opts['_'].length === 0 && !opts['write-file']) {
        const defaultInputs = ['src', 'test'].filter(fs.existsSync);
        opts['_'] = defaultInputs;
        console.log(
          chalk.yellow(
            `Defaulting to "tsdx lint ${defaultInputs.join(' ')}"`,
            '\nYou can override this in the package.json scripts, like "lint": "tsdx lint src otherDir"'
          )
        );
      }

      const config = await createEslintConfig({
        pkg: appPackageJson,
        rootDir: paths.appRoot,
        writeFile: opts['write-file'],
      });

      const cli = new CLIEngine({
        baseConfig: {
          ...config,
          ...appPackageJson.eslint,
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
        fix: opts.fix,
        ignorePattern: opts['ignore-pattern'],
      });
      const report = cli.executeOnFiles(opts['_']);
      if (opts.fix) {
        CLIEngine.outputFixes(report);
      }
      console.log(cli.getFormatter()(report.results));
      if (opts['report-file']) {
        await fs.outputFile(
          opts['report-file'],
          cli.getFormatter('json')(report.results)
        );
      }
      if (report.errorCount) {
        process.exit(1);
      }
      if (report.warningCount > opts['max-warnings']) {
        process.exit(1);
      }
    }
  );

prog.parse(process.argv);
