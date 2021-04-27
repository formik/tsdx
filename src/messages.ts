import chalk from 'chalk';
import getPackageManager from './getPackageManager';
import * as Output from './output';

// This was copied from Razzle. Lots of unused stuff.
const program = {
  name: 'tsdx',
};

export const help = function() {
  return `
    Only ${chalk.green('<project-directory>')} is required.
    If you have any problems, do not hesitate to file an issue:
    ${chalk.cyan('https://github.com/formium/tsdx/issues/new')}
  `;
};

export const missingProjectName = function() {
  return `
Please specify the project directory:
  ${chalk.cyan(program.name)} ${chalk.green('<project-directory>')}
For example:
  ${chalk.cyan(program.name)} ${chalk.green('my-tsdx-lib')}
Run ${chalk.cyan(`${program.name} --help`)} to see all options.
`;
};

export const alreadyExists = function(projectName: string) {
  return `
Uh oh! Looks like there's already a directory called ${chalk.red(
    projectName
  )}. Please try a different name or delete that folder.`;
};

export const installing = function(packages: string[]) {
  const pkgText = packages
    .map(function(pkg) {
      return `    ${chalk.cyan(chalk.bold(pkg))}`;
    })
    .join('\n');

  return `Installing npm modules:
${pkgText}
`;
};

export const installError = function(packages: string[]) {
  const pkgText = packages
    .map(function(pkg) {
      return `${chalk.cyan(chalk.bold(pkg))}`;
    })
    .join(', ');

  Output.error(`Failed to install ${pkgText}, try again.`);
};

export const copying = function(projectName: string) {
  return `
Creating ${chalk.bold(chalk.green(projectName))}...
`;
};

export const start = async function(projectName: string) {
  const commands = await getPackageManager();

  return `
  ${chalk.green('Awesome!')} You're now ready to start coding.
  
  I already ran ${Output.cmd(commands.install)} for you, so your next steps are:
    ${Output.cmd(`cd ${projectName}`)}
  
  To start developing (rebuilds on changes):
    ${Output.cmd(commands.start)}
  
  To build for production:
    ${Output.cmd(commands.build)}

  To test your library with Jest:
    ${Output.cmd(commands.test)}
    
  Questions? Feedback? Please let me know!
  ${chalk.green('https://github.com/formium/tsdx/issues')}
`;
};

export const incorrectNodeVersion = function(requiredVersion: string) {
  return `Unsupported Node version! Your current Node version (${chalk.red(
    process.version
  )}) does not satisfy the requirement of Node ${chalk.cyan(requiredVersion)}.`;
};
