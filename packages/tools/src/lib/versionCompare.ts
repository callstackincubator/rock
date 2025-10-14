export function versionCompare(first: string, second: string) {
  const firstVersion = parseVersionString(first);
  const secondVersion = parseVersionString(second);

  if (!firstVersion || !secondVersion) {
    return first.localeCompare(second);
  }

  if (firstVersion.major !== secondVersion.major) {
    return firstVersion.major - secondVersion.major;
  }
  if (firstVersion.minor !== secondVersion.minor) {
    return firstVersion.minor - secondVersion.minor;
  }

  return firstVersion.patch - secondVersion.patch;
}

function parseVersionString(version: string) {
  if (!isVersionString(version)) {
    return null;
  }

  const [major, minor, patch] = version.split('.').map(Number);
  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
  };
}

function isVersionString(version: string) {
  return /^[0-9]+\.[0-9]+\.[0-9]+$/.test(version);
}
