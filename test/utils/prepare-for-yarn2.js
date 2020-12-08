/*
 * yarn 2 requires each package.json to declare the dependencies used by files within its subdirectory.
 * tsdx tests are written to use the exact same set of dependencies as the root package.json.
 *
 * Before running tests under yarn2 PnP, we copy all dependencies and devDependencies from the root
 * to each sub-package.json.  We also declare these subdirectories as workspaces so `yarn`
 * recognizes and resolves them all.
 */

const fs = require('fs-extra');
const shell = require('shelljs');

shell.cd(__dirname);
shell.cd('../..');
const rootPkg = fs.readJSONSync('package.json');
// Declare all stages as workspaces so that a single `yarn` invocation resolves them all.
rootPkg.workspaces = {
  workspaces: ['test/e2e/fixtures/*', 'test/integration/fixtures/*', 'stage-*'],
};
fs.writeJSONSync('package.json', rootPkg, { spaces: 2 });

// Copy all root dependencies onto each test package.json
for (const pkgPath of [
  shell.ls('test/e2e/fixtures/*/package.json'),
  shell.ls('test/integration/fixtures/*/package.json'),
]
  .join(',')
  .split(',')) {
  const pkg = fs.readJSONSync(`./${pkgPath}`);
  pkg.dependencies = Object.assign({}, pkg.dependencies, rootPkg.dependencies);
  pkg.devDependencies = Object.assign(
    {},
    pkg.devDependencies,
    rootPkg.devDependencies
  );
  fs.writeJSONSync(pkgPath, pkg, { spaces: 2 });
}
