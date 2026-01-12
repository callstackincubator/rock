import {
  color,
  note,
  promptGroup,
  promptSelect,
  promptText,
  type SupportedRemoteCacheProviders,
} from '@rock-js/tools';

export function promptRemoteCacheProvider() {
  return promptSelect<SupportedRemoteCacheProviders | null>({
    message: 'What do you want to use as cache for your remote builds?',
    initialValue: 'github-actions',
    options: [
      {
        value: 'github-actions',
        label: 'GitHub Actions',
        hint: 'The easiest way to start if you store your code on GitHub',
      },
      {
        value: 's3',
        label: 'S3',
        hint: 'Work with any S3-compatible storage, including AWS S3 and Cloudflare R2',
      },
      {
        value: null,
        label: 'None',
        hint: `Local cache only which isn't shared across team members or CI/CD environments`,
      },
    ],
  });
}

export function promptRemoteCacheProviderArgs(
  provider: SupportedRemoteCacheProviders,
) {
  const environmentVariablesTitle =
    'Ensure the below environment variables are set';

  switch (provider) {
    case 'github-actions':
      note(
        [
          `GITHUB_TOKEN      Your GitHub personal access token (PAT)`,
          '',
          `💡 Set this in your ${color.bold('.env')} file or pass it as an argument to ${color.bold('run:*')} commands.`,
        ].join('\n'),
        environmentVariablesTitle,
      );

      return promptGroup({
        owner: () => promptText({ message: 'GitHub repository owner' }),
        repository: () => promptText({ message: 'GitHub repository name' }),
      });
    case 's3':
      note(
        [
          `AWS_ACCESS_KEY_ID          Your AWS access key ID`,
          `AWS_SECRET_ACCESS_KEY      Your AWS secret access key`,
          '',
          `💡 Set these in your ${color.bold('.env')} file or pass them as arguments to ${color.bold('run:*')} commands.`,
        ].join('\n'),
        environmentVariablesTitle,
      );

      return promptGroup({
        bucket: () =>
          promptText({
            message: 'Pass your bucket name:',
            placeholder: 'bucket-name',
            defaultValue: 'bucket-name',
          }),
        region: () =>
          promptText({
            message: 'Pass your bucket region:',
            placeholder: 'us-west-1',
            defaultValue: 'us-west-1',
          }),
        endpoint: () =>
          promptText({
            message: `If you're using self-hosted S3 or Cloudflare R2, pass your endpoint ${color.dim('(Press <enter> to skip)')}:`,
            placeholder: 'https://<ACCOUNT_ID>.r2.cloudflarestorage.com',
            defaultValue: undefined,
          }),
      });
  }
}
