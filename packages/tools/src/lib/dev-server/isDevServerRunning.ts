/**
 * Indicates whether or not the dev server is running. It returns a promise that
 * returns one of these possible values:
 *   - `running`: the dev server is running
 *   - `not_running`: the dev server nor any process is running on the expected port.
 *   - `unrecognized`: one other process is running on the port we expect the dev server to be running.
 */
export async function isDevServerRunning(
  port: string | number = process.env['RCT_METRO_PORT'] || '8081'
): Promise<
  { status: 'running'; root: string } | 'not_running' | 'unrecognized'
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
      return 'unrecognized';
    }

    return 'unrecognized';
  } catch (_error) {
    return 'not_running';
  }
}
