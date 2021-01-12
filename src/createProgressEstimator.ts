import fs from 'fs-extra';

import { paths } from './constants';

const progressEstimator = require('progress-estimator');

export async function createProgressEstimator(showProgress = true) {
  if (!showProgress) {
    return (_promise: Promise<any>, message: string) => {
      console.log(message);
    };
  }
  await fs.ensureDir(paths.progressEstimatorCache);
  return progressEstimator({
    // All configuration keys are optional, but it's recommended to specify a storage location.
    storagePath: paths.progressEstimatorCache,
  });
}
