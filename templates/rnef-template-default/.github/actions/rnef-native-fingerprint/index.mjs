import core from '@actions/core';
import {getConfig} from '@rnef/config';
import {nativeFingerprint} from '@rnef/tools';

const ALLOWED_PLATFORMS = ['android', 'ios'];

async function run() {
  const platform = core.getInput('platform');
  if (!ALLOWED_PLATFORMS.includes(platform)) {
    throw new Error(`Invalid platform: ${platform}`);
  }

  const config = await getConfig('.');
  const fingerprintOptions = config.getFingerprintOptions();

  const fingerprint = await nativeFingerprint('.', {
    platform,
    ...fingerprintOptions,
  });

  console.log('Hash:', fingerprint.hash);
  console.log('Sources:', fingerprint.sources);

  core.setOutput('hash', fingerprint.hash);
}

await run();
