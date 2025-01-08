import path from 'node:path';
import { group, intro, outro, text } from '@clack/prompts';
import type { AndroidProjectConfig } from '@react-native-community/cli-types';
import { checkCancelPrompt, logger, RnefError } from '@rnef/tools';
import spawn from 'nano-spawn';
import color from 'picocolors';

export async function signAndroid(
  androidProject: AndroidProjectConfig,
  args: SignFlags
) {
  intro('Generate a keystore file for signing Android release builds.');
  await runKeytool(androidProject, args);
  outro('Success 🎉.');
}

type SignFlags = {
  name?: string;
  alias?: string;
};

async function runKeytool(
  androidProject: AndroidProjectConfig,
  args: SignFlags
) {
  const { name, alias } = await prompts({ name: args.name, alias: args.alias });
  const keystoreOutputPath = path.join(
    androidProject.sourceDir,
    androidProject.appName,
    `${name}.keystore`
  );
  logger.info(
    `Running "keytool" command. You'll be further prompted for password and extra information.`
  );
  logger.log('');
  try {
    // keytool -genkey -v -keystore release.keystore -alias rnef-alias -keyalg RSA -keysize 2048 -validity 10000
    await spawn(
      'keytool',
      [
        '-genkey',
        '-v',
        '-keystore',
        keystoreOutputPath,
        '-alias',
        alias,
        '-keyalg',
        'RSA',
        '-keysize',
        '2048',
        '-validity',
        '10000',
      ],
      { stdio: 'inherit' }
    );

    logger.success(`Keystore generated at: ${color.cyan(keystoreOutputPath)}`);
    logger.warn(
      `Edit the ${color.bold('~/.gradle/gradle.properties')} or ${color.bold(
        './android/gradle.properties'
      )} file, and add the following (replace ***** with the correct keystore password):`
    );
    console.log(
      color.yellow(`
   RNEF_UPLOAD_STORE_FILE=release.keystore
   RNEF_UPLOAD_KEY_ALIAS=rnef-alias
   RNEF_UPLOAD_STORE_PASSWORD=*****
   RNEF_UPLOAD_KEY_PASSWORD=*****`)
    );
  } catch (error) {
    throw new RnefError(
      'Failed to generate keystore. Please try manually at https://reactnative.dev/docs/signed-apk-android'
    );
  }
}

async function prompts({ name, alias }: SignFlags) {
  return checkCancelPrompt<{ name: string; alias: string }>(
    group({
      name: () =>
        name
          ? Promise.resolve(name)
          : text({ message: 'Provide keystore name', initialValue: 'release' }),
      alias: () =>
        alias
          ? Promise.resolve(alias)
          : text({
              message: 'Provide keystore alias',
              initialValue: 'rnef-alias',
            }),
    })
  );
}

export const signOptions = [
  {
    name: '--name <string>',
    description: 'Name of the keystore file.',
  },
  {
    name: '--alias <string>',
    description: 'Alias for the key.',
  },
];
