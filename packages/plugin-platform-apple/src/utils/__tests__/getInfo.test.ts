import { describe, it, expect, vi, Mock } from 'vitest';
import spawn from 'nano-spawn';
import * as fs from 'fs';
import { getInfo } from '../getInfo.js';
import { XcodeProjectInfo } from '../../types/index.js';

vi.mock('nano-spawn', () => {
  return {
    default: vi.fn(),
  };
});

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
}));

describe('getInfo', () => {
  it('handles non-project / workspace locations in a ', () => {
    const name = `YourProjectName`;

    vi.mocked(fs.readFileSync)
      .mockReturnValueOnce(`<?xml version="1.0" encoding="UTF-8"?>
<Workspace
   version = "1.0">
   <FileRef
      location = "group:${name}.xcodeproj">
   </FileRef>
   <FileRef
      location = "group:Pods/Pods.xcodeproj">
   </FileRef>
   <FileRef
      location = "group:container/some_other_file.mm">
   </FileRef>
</Workspace>`);

    (spawn as Mock).mockResolvedValue({ stdout: '{}' });

    getInfo({ isWorkspace: true, name } as XcodeProjectInfo, 'some/path');

    // Should not call on Pods or the other misc groups
    expect(spawn).toHaveBeenCalledWith(
      'xcodebuild',
      ['-list', '-json', '-project', `some/path/${name}.xcodeproj`],
      { stdio: ['ignore', 'pipe', 'inherit'], cwd: 'some/path' }
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
});
