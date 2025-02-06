import { promptSelect, spawn } from '@rnef/tools';

export type SigningIdentity = {
  hash: string;
  name: string;
};

/**
 * Input is in the form of:
 * ```
 *   1) 1234567890ABCDEF1234567890ABCDEF12345678 "Apple Development: John Doe (TEAMID1234)"
 *   2) ABCDEF1234567890ABCDEF1234567890ABCDEF12 "Apple Distribution: Jane Smith (TEAMID5678)"
 * ```
 * @param output
 * @returns
 */
export function parseSigningIdentities(output: string): SigningIdentity[] {
  const result: SigningIdentity[] = [];
  const lines = output.split('\n');

  const regex = /^\s*(\d+)\)\s+([A-F0-9]+)\s+"(.+)"$/;

  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      const hash = match[2];
      const name = match[3];
      result.push({ hash, name });
    }
  }

  return result;
}

export async function getValidSigningIdentities(): Promise<SigningIdentity[]> {
  const cmd = await spawn('security', [
    'find-identity',
    '-v',
    '-p',
    'codesigning',
  ]);

  return parseSigningIdentities(cmd.stdout);
}

export async function promptSigningIdentity(currentIdentity?: string | null) {
  const identities = await getValidSigningIdentities();

  const current = currentIdentity
    ? identities.find((i) => i.name === currentIdentity)
    : undefined;
  const other = identities.filter((i) => i.name !== currentIdentity);
  const list = current ? [current, ...other] : other;

  return await promptSelect({
    message: 'Select a signing identity:',
    options: list.map((identity) => ({
      label: identity.name,
      value: identity.name,
      hint: identity.name === currentIdentity ? 'Current' : undefined,
    })),
  });
}
