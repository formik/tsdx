import * as shell from 'shelljs';

import * as util from '../utils/fixture';
import { execWithCache, grep } from '../utils/shell';

shell.config.silent = false;

const testDir = 'integration';
const fixtureName = 'build-withBabel';
const stageName = `stage-integration-${fixtureName}`;

describe('integration :: tsdx build :: .babelrc.js', () => {
  beforeAll(() => {
    util.teardownStage(stageName);
    util.setupStageWithFixture(testDir, stageName, fixtureName);
  });

  it('should convert styled-components template tags', () => {
    const output = execWithCache('node ../dist/index.js build --legacy');
    expect(output.code).toBe(0);

    // from styled.h1` to styled.h1.withConfig(
    const matched = grep(/default.h1.withConfig\(/, [
      'dist/build-withbabel.production.min.cjs',
    ]);
    expect(matched).toBeTruthy();
  });

  // TODO: make styled-components work with its Babel plugin and not just its
  // macro by allowing customization of plugin order
  it('should remove comments in the CSS', () => {
    const output = execWithCache('node ../dist/index.js build --legacy');
    expect(output.code).toBe(0);

    // the comment "should be removed" should no longer be there
    const matched = grep(/should be removed/, [
      'dist/build-withbabel.production.min.cjs',
    ]);
    expect(matched).toBeFalsy();
  });

  it('should merge and apply presets', () => {
    const output = execWithCache('node ../dist/index.js build --legacy');
    expect(output.code).toBe(0);

    // ensures replace-identifiers was used
    const matched = grep(/replacedSum/, [
      'dist/build-withbabel.production.min.cjs',
    ]);
    expect(matched).toBeTruthy();
  });

  it('should compile files into a dist directory', () => {
    const output = execWithCache('node ../dist/index.js build --legacy');

    expect(shell.test('-f', 'dist/index.cjs')).toBeTruthy();
    expect(
      shell.test('-f', 'dist/build-withbabel.development.cjs')
    ).toBeTruthy();
    expect(
      shell.test('-f', 'dist/build-withbabel.production.min.cjs')
    ).toBeTruthy();
    expect(shell.test('-f', 'dist/build-withbabel.min.mjs')).toBeTruthy();

    expect(shell.test('-f', 'dist/index.d.ts')).toBeTruthy();

    expect(output.code).toBe(0);
  });

  afterAll(() => {
    util.teardownStage(stageName);
  });
});
