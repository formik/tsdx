import { Template } from './template';

import basicTemplate from './basic';
import { PackageJson } from 'type-fest';

const reactTemplate: Template = {
  name: 'react',
  dependencies: [
    ...basicTemplate.dependencies,
    '@testing-library/react',
    '@testing-library/jest-dom',
    '@types/react',
    '@types/react-dom',
    'react',
    'react-dom',
  ],
  packageJson: {
    ...basicTemplate.packageJson,
    peerDependencies: {
      react: '>=16',
    },
    scripts: {
      ...basicTemplate.packageJson.scripts,
      test: 'tsdx test --passWithNoTests',
    } as PackageJson['scripts'],
    jest: {
      setupFilesAfterEnv: ['./jest.setup.ts'],
    },
  },
};

export default reactTemplate;
