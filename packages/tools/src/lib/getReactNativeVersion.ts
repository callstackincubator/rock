import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

export function getReactNativeVersion(root: string) {
  try {
    const require = createRequire(import.meta.url);
    return JSON.parse(
      fs.readFileSync(
        path.join(
          require.resolve('react-native', { paths: [root] }),
          '..',
          'package.json',
        ),
        'utf-8',
      ),
    ).version;
  } catch {
    return 'unknown';
  }
}
