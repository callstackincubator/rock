import * as tools from '@rnef/tools';
import spawn from 'nano-spawn';
import type { Mock } from 'vitest';
import { describe, it, vi } from 'vitest';
import { checkUsers } from '../listAndroidUsers.js';
// output of "adb -s ... shell pm users list" command
const gradleOutput = `
Users:
        UserInfo{0:Homersimpsons:c13} running
        UserInfo{10:Guest:404}
`;

vi.spyOn(tools, 'spinner').mockImplementation(() => {
  return {
    start: vi.fn(),
    stop: vi.fn(),
    message: vi.fn(),
  };
});

vi.mock('nano-spawn', () => {
  return {
    default: vi.fn(),
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
