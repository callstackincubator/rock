import type * as Fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type * as Tools from '@rock-js/tools';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('node:fs');

const fs = await vi.importActual<typeof Fs>('node:fs');

vi.mock('@rock-js/tools', async (importOriginal) => ({
  ...(await importOriginal<typeof Tools>()),
  spinner: () => ({ start: vi.fn(), stop: vi.fn() }),
}));

const { copyHermesXcframework } = await import('../copyHermesXcframework.js');

const CATALYST_FRAMEWORK =
  'hermesvm.xcframework/ios-arm64_x86_64-maccatalyst/hermesvm.framework';

describe('copyHermesXcframework', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'copy-hermes-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('keeps relative symlinks of versioned framework slices relative', () => {
    const sourceDir = path.join(tempDir, 'ios');
    const destinationDir = path.join(tempDir, 'package');
    const sourceFramework = path.join(
      sourceDir,
      'Pods/hermes-engine/destroot/Library/Frameworks/universal',
      CATALYST_FRAMEWORK,
    );
    fs.mkdirSync(path.join(sourceFramework, 'Versions/1/Resources'), {
      recursive: true,
    });
    fs.writeFileSync(path.join(sourceFramework, 'Versions/1/hermesvm'), '');
    fs.symlinkSync('1', path.join(sourceFramework, 'Versions/Current'));
    fs.symlinkSync(
      'Versions/Current/hermesvm',
      path.join(sourceFramework, 'hermesvm'),
    );
    fs.symlinkSync(
      'Versions/Current/Resources',
      path.join(sourceFramework, 'Resources'),
    );

    copyHermesXcframework({
      sourceDir,
      destinationDir,
      reactNativeVersion: '0.82.0',
    });

    const copiedFramework = path.join(destinationDir, CATALYST_FRAMEWORK);
    expect(
      fs.readlinkSync(path.join(copiedFramework, 'Versions/Current')),
    ).toBe('1');
    expect(fs.readlinkSync(path.join(copiedFramework, 'hermesvm'))).toBe(
      'Versions/Current/hermesvm',
    );
    expect(fs.readlinkSync(path.join(copiedFramework, 'Resources'))).toBe(
      'Versions/Current/Resources',
    );
  });
});
