import execa from 'execa';
import { checkUsers } from '../listAndroidUsers.js';
import { vi, Mock } from 'vitest';
// output of "adb -s ... shell pm users list" command
const gradleOutput = `
Users:
        UserInfo{0:Homersimpsons:c13} running
        UserInfo{10:Guest:404}
`;

vi.mock('execa', () => {
  return { sync: vi.fn() };
});

describe('check android users', () => {
  it('should correctly parse recieved users', () => {
    (execa.sync as Mock).mockReturnValueOnce({ stdout: gradleOutput });
    const users = checkUsers('device', 'adbPath');

    expect(users).toStrictEqual([
      { id: '0', name: 'Homersimpsons' },
      { id: '10', name: 'Guest' },
    ]);
  });
});
