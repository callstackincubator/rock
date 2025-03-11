const core = require('@actions/core');
const { nativeFingerprint } = require('@rnef/tools');

const ALLOWED_PLATFORMS = ['android', 'ios'];

async function run() {
  const platform = core.getInput('platform');
  if (!ALLOWED_PLATFORMS.includes(platform)) {
    throw new Error(`Invalid platform: ${platform}`);
  }

  const fingerprint = await nativeFingerprint('.', {
    platform,
  });

  console.log('Hash:', fingerprint.hash);
  console.log('Sources:', fingerprint.sources);

  core.setOutput('hash', fingerprint.hash);
}

// Execute the run function and handle any errors
run().catch(error => {
  core.setFailed(error.message);
  process.exit(1);
});
