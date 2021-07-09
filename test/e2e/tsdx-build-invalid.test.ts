import * as shell from 'shelljs';

import * as util from '../utils/fixture';
import { execWithCache } from '../utils/shell';

shell.config.silent = false;

const testDir = 'e2e';
const fixtureName = 'build-invalid';
const stageName = `stage-${fixtureName}`;

describe('tsdx build :: invalid build', () => {
  beforeAll(() => {
    util.teardownStage(stageName);
    util.setupStageWithFixture(testDir, stageName, fixtureName);
  });

  it('should fail gracefully with exit code 1 when build failed', () => {
    const output = execWithCache('node ../dist/index.js build --legacy');
    expect(output.code).toBe(1);
  });

  it('should only transpile and not type check', () => {
    const output = execWithCache('node ../dist/index.js build --legacy --transpileOnly');

    expect(shell.test('-f', 'dist/index.cjs')).toBeTruthy();
    expect(
      shell.test('-f', 'dist/build-invalid.development.cjs')
    ).toBeTruthy();
    expect(
      shell.test('-f', 'dist/build-invalid.production.min.cjs')
    ).toBeTruthy();
    expect(shell.test('-f', 'dist/build-invalid.min.mjs')).toBeTruthy();

    expect(shell.test('-f', 'dist/index.d.ts')).toBeTruthy();

    expect(output.code).toBe(0);
  });

  afterAll(() => {
    util.teardownStage(stageName);
  });
});
