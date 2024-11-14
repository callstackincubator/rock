import spawn from 'nano-spawn';
import { checkUsers } from '../listAndroidUsers.js';
import { vi, Mock, describe, it } from 'vitest';
// output of "adb -s ... shell pm users list" command
const gradleOutput = `
Users:
        UserInfo{0:Homersimpsons:c13} running
        UserInfo{10:Guest:404}
`;

vi.mock('nano-spawn', () => {
  return {
    default: vi.fn(),
  };
});

vi.mock('@clack/prompts', () => {
  return {
    spinner: vi.fn(() => ({ start: vi.fn(), message: vi.fn(), stop: vi.fn() })),
    isCancel: vi.fn(() => false),
  };
});

describe('check android users', () => {
  it('should correctly parse recieved users', async () => {
    (spawn as Mock).mockResolvedValueOnce({ stdout: gradleOutput });
    const users = await checkUsers('device');

    expect(users).toStrictEqual([
      { id: '0', name: 'Homersimpsons' },
      { id: '10', name: 'Guest' },
    ]);
  });
});
