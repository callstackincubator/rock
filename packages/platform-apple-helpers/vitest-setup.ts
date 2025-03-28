import { vi } from 'vitest';

vi.mock('node:fs');

vi.mock('@rnef/tools', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('@rnef/tools')>();
  return {
    ...actual,
    isInteractive: vi.fn(),
    // Logger
    logger: {
      ...actual.logger,
      success: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      log: vi.fn(),
    },
    // Prompts
    intro: vi.fn(),
    outro: vi.fn(),
    note: vi.fn(),
    promptConfirm: vi.fn(),
    promptMultiSelect: vi.fn(),
    promptSelect: vi.fn(),
    promptText: vi.fn(),
    spinner: vi.fn(() => ({
      start: vi.fn(),
      stop: vi.fn(),
      message: vi.fn(),
    })),
    // Spawn
    spawn: vi.fn(),
  };
});
