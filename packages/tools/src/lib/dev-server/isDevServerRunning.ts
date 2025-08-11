/**
 * Indicates whether or not the dev server is running. It returns a promise that
 * returns one of these possible values:
 *   - `{status: 'running', root: string}`: the dev server is running
 *   - `{status: 'not_running'}`: the dev server nor any process is running on the expected port.
 *   - `{status: 'unrecognized'}`: one other process is running on the port we expect the dev server to be running.
 */
export async function isDevServerRunning(
  port: string | number = process.env['RCT_METRO_PORT'] || '8081',
): Promise<
  | { status: 'running'; root: string }
  | { status: 'not_running' | 'unrecognized' }
> {
  try {
    const response = await fetch(`http://localhost:${port}/status`);

    const data = await response.text();

    try {
      if (data === 'packager-status:running') {
        return {
          status: 'running',
          root: response.headers.get('X-React-Native-Project-Root') ?? '',
        };
      }
    } catch (_error) {
      return { status: 'unrecognized' };
    }

    return { status: 'unrecognized' };
  } catch (_error) {
    return { status: 'not_running' };
  }
}
