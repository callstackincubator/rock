import { describe, expect, type Mock, test, vi } from 'vitest';

vi.mock('@rock-js/tools', async (importOriginal) => {
  const actual =
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    await importOriginal<typeof import('@rock-js/tools')>();
  return {
    ...actual,
    spawn: vi.fn(),
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      isVerbose: () => false,
    },
    cacheManager: {
      get: vi.fn(() => undefined),
      set: vi.fn(),
      remove: vi.fn(),
    },
  };
});

import { spawn } from '@rock-js/tools';
import { getGitHubCLIToken } from '../lib/config.js';
import { providerGitHub } from '../lib/providerGitHub.js';

describe('getGitHubCLIToken', () => {
  test('returns token from gh CLI when available', async () => {
    (spawn as Mock).mockResolvedValueOnce({ output: 'gh_test_token_123\n' });
    const token = await getGitHubCLIToken();
    expect(token).toBe('gh_test_token_123');
    expect(spawn).toHaveBeenCalledWith('gh', ['auth', 'token'], {
      stdio: 'pipe',
    });
  });

  test('returns undefined when gh CLI is not installed', async () => {
    (spawn as Mock).mockRejectedValueOnce(new Error('spawn gh ENOENT'));
    const token = await getGitHubCLIToken();
    expect(token).toBeUndefined();
  });

  test('returns undefined when gh CLI returns empty output', async () => {
    (spawn as Mock).mockResolvedValueOnce({ output: '' });
    const token = await getGitHubCLIToken();
    expect(token).toBeUndefined();
  });

  test('returns undefined when gh CLI is not authenticated', async () => {
    (spawn as Mock).mockRejectedValueOnce(
      new Error('You are not logged into any GitHub hosts'),
    );
    const token = await getGitHubCLIToken();
    expect(token).toBeUndefined();
  });
});

describe('GitHubBuildCache GH CLI fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    delete process.env['GITHUB_TOKEN'];
  });

  afterEach(() => {
    delete process.env['GITHUB_TOKEN'];
  });

  test('falls back to gh CLI token when no explicit token or GITHUB_TOKEN env var', async () => {
    (spawn as Mock).mockResolvedValueOnce({ output: 'gh_cli_token\n' });
    (global.fetch as Mock).mockResolvedValue(
      new Response(JSON.stringify({ artifacts: [] })),
    );

    const cacheProvider = providerGitHub({
      owner: 'callstack',
      repository: 'rock',
      token: '',
    })();

    const result = await cacheProvider.list({ artifactName: 'test' });
    expect(result).toEqual([]);
    expect(spawn).toHaveBeenCalledWith('gh', ['auth', 'token'], {
      stdio: 'pipe',
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('api.github.com'),
      {
        headers: { Authorization: 'token gh_cli_token' },
      },
    );
  });

  test('throws error when no token available and gh CLI fails', async () => {
    (spawn as Mock).mockRejectedValueOnce(new Error('spawn gh ENOENT'));

    const cacheProvider = providerGitHub({
      owner: 'callstack',
      repository: 'rock',
      token: '',
    })();

    await expect(
      cacheProvider.list({ artifactName: 'test' }),
    ).rejects.toThrow(/GitHub Personal Access Token is required/);
  });

  test('uses explicit token when provided (no gh CLI fallback needed)', async () => {
    (global.fetch as Mock).mockResolvedValue(
      new Response(JSON.stringify({ artifacts: [] })),
    );

    const cacheProvider = providerGitHub({
      owner: 'callstack',
      repository: 'rock',
      token: 'EXPLICIT_TOKEN',
    })();

    await cacheProvider.list({ artifactName: 'test' });
    expect(spawn).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('api.github.com'),
      {
        headers: { Authorization: 'token EXPLICIT_TOKEN' },
      },
    );
  });

  test('uses GITHUB_TOKEN env var over gh CLI', async () => {
    process.env['GITHUB_TOKEN'] = 'ENV_TOKEN';
    (global.fetch as Mock).mockResolvedValue(
      new Response(JSON.stringify({ artifacts: [] })),
    );

    const cacheProvider = providerGitHub({
      owner: 'callstack',
      repository: 'rock',
      token: '',
    })();

    await cacheProvider.list({ artifactName: 'test' });
    expect(spawn).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('api.github.com'),
      {
        headers: { Authorization: 'token ENV_TOKEN' },
      },
    );
  });
});
