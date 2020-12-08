import * as path from 'path';
import * as shell from 'shelljs';

export const rootDir = process.cwd();

shell.config.silent = true;

export function isYarn2() {
  return !!process.versions.pnp;
}

export function setupStageWithFixture(
  testDir: string,
  stageName: string,
  fixtureName: string
): void {
  const stagePath = path.join(rootDir, stageName);
  shell.mkdir(stagePath);
  shell.exec(
    `cp -a ${rootDir}/test/${testDir}/fixtures/${fixtureName}/. ${stagePath}/`
  );
  if (!isYarn2()) {
    shell.ln(
      '-s',
      path.join(rootDir, 'node_modules'),
      path.join(stagePath, 'node_modules')
    );
  }
  shell.cd(stagePath);
}

export function teardownStage(stageName: string): void {
  shell.cd(rootDir);
  shell.rm('-rf', path.join(rootDir, stageName));
}
