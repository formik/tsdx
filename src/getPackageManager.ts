import execa from 'execa';
import { existsSync } from 'fs';

export type InstallArgsMaker = (packages: string[]) => string[];

export interface PackageManager {
  name: string;
  install: string;
  build: string;
  start: string;
  test: string;
  lockFiles: string[];
  getInstallArgs: InstallArgsMaker;
  installed: boolean;
  checkIsInstalled: () => Promise<any> | void;
}

export const packageManagers: { [key: string]: PackageManager } = {
  yarn: {
    name: 'yarn',
    install: 'yarn install',
    build: 'yarn build',
    start: 'yarn start',
    test: 'yarn test',
    lockFiles: ['yarn.lock'],
    getInstallArgs: packages => ['add', ...packages, '--dev'],
    installed: false,
    checkIsInstalled: () => execa('yarnpkg', ['--version']),
  },
  pnpm: {
    name: 'pnpm',
    install: 'pnpm i',
    build: 'pnpm run build',
    start: 'pnpm run start',
    test: 'pnpm test',
    lockFiles: ['pnpm-lock.yaml'],
    getInstallArgs: packages => ['i', ...packages, '--save-dev'],
    installed: false,
    checkIsInstalled: () => execa('pnpm', ['--version']),
  },
  npm: {
    name: 'npm',
    install: 'npm install',
    build: 'npm run build',
    start: 'npm run start',
    test: 'npm test',
    lockFiles: ['npm-shrinkwrap.json'],
    getInstallArgs: packages => ['install', ...packages, '--save-dev'],
    installed: true,
    checkIsInstalled: () => {},
  },
};

let packageManager: PackageManager;

export type PackageManagerName = keyof typeof packageManagers;

export default async function getPackageManager(): Promise<PackageManager> {
  if (packageManager) {
    return packageManager;
  }

  // Test which package managers are installed
  for (let pmName in packageManagers)
    try {
      await packageManagers[pmName].checkIsInstalled();
      packageManagers[pmName].installed = true;
    } catch (e) {}

  // If a lock file exists in project, then we can't use any other package manager than that
  for (let pmName in packageManagers)
    for (let lockFileName of packageManagers[pmName].lockFiles) {
      try {
        if (existsSync(lockFileName))
          return (packageManager = packageManagers[pmName]);
      } catch (e) {}
    }

  // If user specified package_manager with 'npm config set package_manager xxx' - use it
  try {
    const pmName = (await execa('npm', ['config', 'get', 'package_manager']))
      .stdout;
    if (packageManagers[pmName as any]) {
      return (packageManager = packageManagers[pmName as any]);
    }
  } catch (e) {}

  // Else pick the first one installed
  for (let pmName in packageManagers)
    if (packageManagers[pmName].installed)
      return (packageManager = packageManagers[pmName]);

  // Else pick npm
  return (packageManager = packageManagers.npm);
}
