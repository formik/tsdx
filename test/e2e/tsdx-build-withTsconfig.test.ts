import * as shell from 'shelljs';

import * as util from '../utils/fixture';
import { execWithCache } from '../utils/shell';

shell.config.silent = false;

const testDir = 'e2e';
const fixtureName = 'build-withTsconfig';
const stageName = `stage-${fixtureName}`;

describe('tsdx build :: build with custom tsconfig.json options', () => {
  beforeAll(() => {
    util.teardownStage(stageName);
    util.setupStageWithFixture(testDir, stageName, fixtureName);
  });

  it('should use the declarationDir when set', () => {
    const output = execWithCache('node ../dist/index.js build --legacy');

    expect(shell.test('-f', 'dist/index.cjs')).toBeTruthy();
    expect(
      shell.test('-f', 'dist/build-withtsconfig.development.cjs')
    ).toBeTruthy();
    expect(
      shell.test('-f', 'dist/build-withtsconfig.production.min.cjs')
    ).toBeTruthy();
    expect(shell.test('-f', 'dist/build-withtsconfig.min.mjs')).toBeTruthy();

    expect(shell.test('-f', 'dist/index.d.ts')).toBeFalsy();
    expect(shell.test('-f', 'typings/index.d.ts')).toBeTruthy();
    expect(shell.test('-f', 'typings/index.d.ts.map')).toBeTruthy();

    expect(output.code).toBe(0);
  });

  it('should set __esModule according to esModuleInterop', () => {
    const output = execWithCache('node ../dist/index.js build --legacy');

    const lib = require(`../../${stageName}/dist/build-withtsconfig.production.min.cjs`);
    // if esModuleInterop: false, no __esModule is added, therefore undefined
    expect(lib.__esModule).toBe(undefined);

    expect(output.code).toBe(0);
  });

  it('should read custom --tsconfig path', () => {
    const output = execWithCache(
      'node ../dist/index.js build --legacy --format cjs --tsconfig ./src/tsconfig.json'
    );

    expect(shell.test('-f', 'dist/index.cjs')).toBeTruthy();
    expect(
      shell.test('-f', 'dist/build-withtsconfig.development.cjs')
    ).toBeTruthy();
    expect(
      shell.test('-f', 'dist/build-withtsconfig.production.min.cjs')
    ).toBeTruthy();

    expect(shell.test('-f', 'dist/index.d.ts')).toBeFalsy();
    expect(shell.test('-f', 'typingsCustom/index.d.ts')).toBeTruthy();
    expect(shell.test('-f', 'typingsCustom/index.d.ts.map')).toBeTruthy();

    expect(output.code).toBe(0);
  });

  afterAll(() => {
    util.teardownStage(stageName);
  });
});
