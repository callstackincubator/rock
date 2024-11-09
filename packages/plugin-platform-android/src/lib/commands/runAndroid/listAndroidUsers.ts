import { select } from '@clack/prompts';
import { listUsers } from '../buildAndroid/adb.js';

type User = {
  id: string;
  name: string;
};

export async function checkUsers(device: string): Promise<User[]> {
  return listUsers(device);
}

export async function promptForUser(users: User[]) {
  const selectedUser = (await select({
    message: 'Which profile would you like to launch your app into?',
    options: users.map((user) => ({
      label: user.name,
      value: user,
    })),
  })) as User;

  return selectedUser;
}
