const core = require('@actions/core');
const {createFingerprintAsync} = require('@expo/fingerprint');

async function run() {
  const platforms = core.getInput('platforms').split(',');
  console.log('Platforms:', platforms);

  const fingerprint = await createFingerprintAsync('.', {
    platforms,
  });

  const details = fingerprint.sources.map(source =>
    removeUndefinedKeys({
      type: source.type,
      id: source.id,
      filePath: source.filePath,
      hash: source.hash,
    }),
  );

  console.log('Hash:', fingerprint.hash);
  console.log('Details:', details);

  core.setOutput('hash', fingerprint.hash);
}

function removeUndefinedKeys(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined),
  );
}

run();
