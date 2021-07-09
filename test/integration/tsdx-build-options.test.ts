import * as shell from 'shelljs';

import * as util from '../utils/fixture';
import { execWithCache } from '../utils/shell';

shell.config.silent = false;

const testDir = 'integration';
const fixtureName = 'build-options';
const stageName = `stage-integration-${fixtureName}`;

describe('integration :: tsdx build :: options', () => {
  beforeAll(() => {
    util.teardownStage(stageName);
    util.setupStageWithFixture(testDir, stageName, fixtureName);
  });

  it('should create errors/ dir with --extractErrors', () => {
    const output = execWithCache('node ../dist/index.js build --legacy --extractErrors');

    expect(shell.test('-f', 'errors/ErrorDev.js')).toBeTruthy();
    expect(shell.test('-f', 'errors/ErrorProd.js')).toBeTruthy();
    expect(shell.test('-f', 'errors/codes.json')).toBeTruthy();

    expect(output.code).toBe(0);
  });

  it('should have correct errors/codes.json', () => {
    const output = execWithCache('node ../dist/index.js build --legacy --extractErrors');

    const errors = require(`../../${stageName}/errors/codes.json`);
    expect(errors['0']).toBe('error occurred! o no');
    // TODO: warning is actually not extracted, only invariant
    // expect(errors['1']).toBe('warning - water is wet');

    expect(output.code).toBe(0);
  });

  it('should compile files into a dist directory', () => {
    const output = execWithCache('node ../dist/index.js build --legacy --extractErrors');

    expect(shell.test('-f', 'dist/index.cjs')).toBeTruthy();
    expect(shell.test('-f', 'dist/build-options.development.cjs')).toBeTruthy();
    expect(
      shell.test('-f', 'dist/build-options.production.min.cjs')
    ).toBeTruthy();
    expect(shell.test('-f', 'dist/build-options.min.mjs')).toBeTruthy();

    expect(shell.test('-f', 'dist/index.d.ts')).toBeTruthy();

    expect(output.code).toBe(0);
  });

  afterAll(() => {
    util.teardownStage(stageName);
  });
});
