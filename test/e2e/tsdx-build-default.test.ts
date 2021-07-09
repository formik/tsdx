import * as shell from 'shelljs';

import * as util from '../utils/fixture';
import { execWithCache, grep } from '../utils/shell';

shell.config.silent = false;

const testDir = 'e2e';
const fixtureName = 'build-default';
const stageName = `stage-${fixtureName}`;

describe('tsdx build :: zero-config defaults', () => {
  beforeAll(() => {
    util.teardownStage(stageName);
    util.setupStageWithFixture(testDir, stageName, fixtureName);
  });

  it('should compile files into a dist directory', () => {
    const output = execWithCache('node ../dist/index.js build --legacy');

    expect(shell.test('-f', 'dist/index.cjs')).toBeTruthy();
    expect(shell.test('-f', 'dist/build-default.development.cjs')).toBeTruthy();
    expect(
      shell.test('-f', 'dist/build-default.production.min.cjs')
    ).toBeTruthy();
    expect(shell.test('-f', 'dist/build-default.min.mjs')).toBeTruthy();

    expect(shell.test('-f', 'dist/index.d.ts')).toBeTruthy();

    expect(output.code).toBe(0);
  });

  it("shouldn't compile files in test/ or types/", () => {
    const output = execWithCache('node ../dist/index.js build --legacy');

    expect(shell.test('-d', 'dist/test/')).toBeFalsy();
    expect(shell.test('-d', 'dist/types/')).toBeFalsy();

    expect(output.code).toBe(0);
  });

  it('should create the library correctly', async () => {
    const output = execWithCache('node ../dist/index.js build --legacy');

    /**
     * Cannot test ESM import here since it is emitted as CJS. Getting tsdx to
     * compile itself will be a future goal.
     *
     * @todo Compile TSDX with itself so `import` statements can be tested
     */
    // const libs = [
    //   require(`../../${stageName}/dist/index.cjs`),
    //   await import(`../../${stageName}/dist/index.mjs`)
    // ];
    /**
     * So just test CJS import for now. The package.jsons aren't simulated using
     * the CLI, so we're resolving it ourselves here to dist/index.cjs.
     */
    const libs = [require(`../../${stageName}/dist/index.cjs`)];

    for (const lib of libs) {
      expect(lib.returnsTrue()).toBe(true);
      expect(lib.__esModule).toBe(true); // test that ESM -> CJS interop was output

      // syntax tests
      expect(lib.testNullishCoalescing()).toBe(true);
      expect(lib.testOptionalChaining()).toBe(true);
      // can't use an async generator in Jest yet, so use next().value instead of yield
      expect(lib.testGenerator().next().value).toBe(true);
      expect(await lib.testAsync()).toBe(true);

      expect(output.code).toBe(0);
    }
  });

  it('should bundle regeneratorRuntime', () => {
    const output = execWithCache('node ../dist/index.js build --legacy');
    expect(output.code).toBe(0);

    const matched = grep(/regeneratorRuntime = r/, [
      'dist/build-default.*.cjs',
    ]);
    expect(matched).toBeTruthy();
  });

  it('should use lodash for the CJS build', () => {
    const output = execWithCache('node ../dist/index.js build --legacy');
    expect(output.code).toBe(0);

    const matched = grep(/lodash/, ['dist/build-default.*.cjs']);
    expect(matched).toBeTruthy();
  });

  it('should use lodash-es for the ESM build', () => {
    const output = execWithCache('node ../dist/index.js build --legacy');
    expect(output.code).toBe(0);

    const matched = grep(/lodash-es/, ['dist/build-default.min.mjs']);
    expect(matched).toBeTruthy();
  });

  it("shouldn't replace lodash/fp", () => {
    const output = execWithCache('node ../dist/index.js build --legacy');
    expect(output.code).toBe(0);

    const matched = grep(/lodash\/fp/, ['dist/build-default.*.cjs']);
    expect(matched).toBeTruthy();
  });

  it('should clean the dist directory before rebuilding', () => {
    let output = execWithCache('node ../dist/index.js build --legacy');
    expect(output.code).toBe(0);

    shell.mv('package.json', 'package-og.json');
    shell.mv('package2.json', 'package.json');

    // cache bust because we want to re-run this command with new package.json
    output = execWithCache('node ../dist/index.js build --legacy', { noCache: true });
    expect(shell.test('-f', 'dist/index.cjs')).toBeTruthy();

    // build-default files have been cleaned out
    expect(shell.test('-f', 'dist/build-default.development.cjs')).toBeFalsy();
    expect(
      shell.test('-f', 'dist/build-default.production.min.cjs')
    ).toBeFalsy();
    expect(shell.test('-f', 'dist/build-default.min.mjs')).toBeFalsy();

    // build-default-2 files have been added
    expect(
      shell.test('-f', 'dist/build-default-2.development.cjs')
    ).toBeTruthy();
    expect(
      shell.test('-f', 'dist/build-default-2.production.min.cjs')
    ).toBeTruthy();
    expect(shell.test('-f', 'dist/build-default-2.min.mjs')).toBeTruthy();

    expect(shell.test('-f', 'dist/index.d.ts')).toBeTruthy();

    expect(output.code).toBe(0);

    // reset package.json files
    shell.mv('package.json', 'package2.json');
    shell.mv('package-og.json', 'package.json');
  });

  afterAll(() => {
    util.teardownStage(stageName);
  });
});
