import glob from 'fast-glob';
import unixifyPaths from '../utils/unixifyPaths.js';

// These folders will be excluded from search to speed it up
const GLOB_EXCLUDE_PATTERN = ['**/@(Pods|node_modules|Carthage|vendor)/**'];

export default function findAllPodfilePaths(cwd: string) {
  return glob.sync('**/Podfile', {
    cwd: unixifyPaths(cwd),
    ignore: GLOB_EXCLUDE_PATTERN,
    // Stop unbounded globbing and infinite loops for projects
    // with deeply nested subdirectories. The most likely result
    // is `ios/Podfile`, so this depth should be plenty:
    deep: 10,
  });
}
