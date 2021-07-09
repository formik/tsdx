import * as shell from 'shelljs';

import * as util from '../utils/fixture';
import { execWithCache, grep } from '../utils/shell';

shell.config.silent = false;

const testDir = 'e2e';
const fixtureName = 'build-default';
// create a second version of build-default's stage for concurrent testing
const stageName = 'stage-build-options';

describe('tsdx build :: options', () => {
  beforeAll(() => {
    util.teardownStage(stageName);
    util.setupStageWithFixture(testDir, stageName, fixtureName);
  });

  it('should compile all formats', () => {
    const output = execWithCache(
      'node ../dist/index.js build --legacy --format cjs,esm,umd,system'
    );

    expect(shell.test('-f', 'dist/index.cjs')).toBeTruthy();
    expect(shell.test('-f', 'dist/build-default.development.cjs')).toBeTruthy();
    expect(
      shell.test('-f', 'dist/build-default.production.min.cjs')
    ).toBeTruthy();
    expect(shell.test('-f', 'dist/build-default.min.mjs')).toBeTruthy();
    expect(
      shell.test('-f', 'dist/build-default.umd.development.cjs')
    ).toBeTruthy();
    expect(
      shell.test('-f', 'dist/build-default.umd.production.min.cjs')
    ).toBeTruthy();
    expect(
      shell.test('-f', 'dist/build-default.system.development.cjs')
    ).toBeTruthy();
    expect(
      shell.test('-f', 'dist/build-default.system.production.min.cjs')
    ).toBeTruthy();

    expect(shell.test('-f', 'dist/index.d.ts')).toBeTruthy();

    expect(output.code).toBe(0);
  });

  it('should not bundle regeneratorRuntime when targeting Node', () => {
    const output = execWithCache('node ../dist/index.js build --legacy --target node');
    expect(output.code).toBe(0);

    const matched = grep(/regeneratorRuntime = r/, [
      'dist/build-default.*.cjs',
    ]);
    expect(matched).toBeFalsy();
  });

  afterAll(() => {
    util.teardownStage(stageName);
  });
});
