import spawn from 'nano-spawn';
import { logger } from '@react-native-community/cli-tools';
import { select } from '@clack/prompts';

type User = {
  id: string;
  name: string;
};

export async function checkUsers(device: string, adbPath: string) {
  try {
    const adbArgs = ['-s', device, 'shell', 'pm', 'list', 'users'];

    logger.debug(`Checking users on "${device}"...`);
    const { stdout } = await spawn(adbPath, adbArgs);
    const regex = new RegExp(
      /^\s*UserInfo\{(?<userId>\d+):(?<userName>.*):(?<userFlags>[0-9a-f]*)}/
    );
    const users: User[] = [];

    const lines = stdout.split('\n');
    for (const line of lines) {
      const res = regex.exec(line);
      if (res?.groups) {
        users.push({ id: res.groups['userId'], name: res.groups['userName'] });
      }
    }

    if (users.length > 1) {
      logger.debug(
        `Available users are:\n${users
          .map((user) => `${user.name} - ${user.id}`)
          .join('\n')}`
      );
    }

    return users;
  } catch (error) {
    logger.error('Failed to check users of device.', error as string);
    return [];
  }
}

export async function promptForUser(users: User[]) {
  const selectedUser = await select({
    message: 'Which profile would you like to launch your app into?',
    options: users.map((user) => ({
      label: user.name,
      value: user,
    })),
  }) as User;

  return selectedUser;
}
