/**
 * @jest-environment node
 */

const shell = require('shelljs');
const fs = require('fs-extra');

const util = require('../fixtures/util');

shell.config.silent = false;

const stageName = 'stage-build';

describe('tsdx build', () => {
  beforeAll(() => {
    util.teardownStage(stageName);
  });

  it('should compile files into a dist directory', () => {
    util.setupStageWithFixture(stageName, 'build-default');

    const output = shell.exec('node ../dist/index.js build --format esm,cjs');

    expect(shell.test('-f', 'dist/index.js')).toBeTruthy();
    expect(
      shell.test('-f', 'dist/build-default.cjs.development.js')
    ).toBeTruthy();
    expect(
      shell.test('-f', 'dist/build-default.cjs.production.min.js')
    ).toBeTruthy();
    expect(shell.test('-f', 'dist/build-default.esm.js')).toBeTruthy();

    expect(shell.test('-f', 'dist/index.d.ts')).toBeTruthy();

    expect(output.code).toBe(0);
  });

  it('should create the library correctly', () => {
    util.setupStageWithFixture(stageName, 'build-default');

    shell.exec('node ../dist/index.js build');

    const lib = require(`../../${stageName}/dist`);
    expect(lib.foo()).toBe('bar');
  });

  it('should create declarationMap files (*.d.ts.map) correctly', async () => {
    util.setupStageWithFixture(stageName, 'build-default');

    shell.exec('node ../dist/index.js build');

    expect(shell.test('-f', 'dist/index.d.ts.map')).toBeTruthy();

    const dtsmap = await fs.readJSON('dist/index.d.ts.map');
    expect(dtsmap.sources[0]).toBe('../src/index.ts');
  });

  it('should clean the dist directory before rebuilding', () => {
    util.setupStageWithFixture(stageName, 'build-default');

    shell.mv('package.json', 'package-og.json');
    shell.mv('package2.json', 'package.json');

    const output = shell.exec('node ../dist/index.js build --format esm,cjs');
    expect(shell.test('-f', 'dist/index.js')).toBeTruthy();

    // build-default files have been cleaned out
    expect(
      shell.test('-f', 'dist/build-default.cjs.development.js')
    ).toBeFalsy();
    expect(
      shell.test('-f', 'dist/build-default.cjs.production.min.js')
    ).toBeFalsy();
    expect(shell.test('-f', 'dist/build-default.esm.js')).toBeFalsy();

    // build-default-2 files have been added
    expect(
      shell.test('-f', 'dist/build-default-2.cjs.development.js')
    ).toBeTruthy();
    expect(
      shell.test('-f', 'dist/build-default-2.cjs.production.min.js')
    ).toBeTruthy();
    expect(shell.test('-f', 'dist/build-default-2.esm.js')).toBeTruthy();

    expect(shell.test('-f', 'dist/index.d.ts')).toBeTruthy();

    expect(output.code).toBe(0);

    // reset package.json files
    shell.mv('package.json', 'package2.json');
    shell.mv('package-og.json', 'package.json');
  });

  it('should fail gracefully with exit code 1 when build failed', () => {
    util.setupStageWithFixture(stageName, 'build-invalid');
    const code = shell.exec('node ../dist/index.js build').code;
    expect(code).toBe(1);
  });

  it('should only transpile and not type check', () => {
    util.setupStageWithFixture(stageName, 'build-invalid');
    const code = shell.exec('node ../dist/index.js build --transpileOnly').code;

    expect(shell.test('-f', 'dist/index.js')).toBeTruthy();
    expect(
      shell.test('-f', 'dist/build-invalid.cjs.development.js')
    ).toBeTruthy();
    expect(
      shell.test('-f', 'dist/build-invalid.cjs.production.min.js')
    ).toBeTruthy();
    expect(shell.test('-f', 'dist/build-invalid.esm.js')).toBeTruthy();

    expect(shell.test('-f', 'dist/index.d.ts')).toBeTruthy();

    expect(code).toBe(0);
  });

  it('should use the declarationDir when set in tsconfig', async () => {
    util.setupStageWithFixture(stageName, 'build-withTsconfig');

    const output = shell.exec('node ../dist/index.js build --format esm,cjs');

    expect(shell.test('-f', 'dist/index.js')).toBeTruthy();
    expect(
      shell.test('-f', 'dist/build-withtsconfig.cjs.development.js')
    ).toBeTruthy();
    expect(
      shell.test('-f', 'dist/build-withtsconfig.cjs.production.min.js')
    ).toBeTruthy();
    expect(shell.test('-f', 'dist/build-withtsconfig.esm.js')).toBeTruthy();

    expect(shell.test('-f', 'dist/index.d.ts')).toBeFalsy();
    expect(shell.test('-f', 'typings/index.d.ts')).toBeTruthy();
    expect(shell.test('-f', 'typings/index.d.ts.map')).toBeTruthy();

    const dtsmap = await fs.readJSON('typings/index.d.ts.map');
    expect(dtsmap.sources[0]).toBe('../src/index.ts');

    expect(output.code).toBe(0);
  });

  afterEach(() => {
    util.teardownStage(stageName);
  });
});
