import { describe, it, expect, vi } from 'vitest';
import { execaSync } from 'execa';
import * as fs from 'fs';
import { getInfo } from '../getInfo.js';
import { XcodeProjectInfo } from '../../types/index.js';

vi.mock('execa', () => ({
  execaSync: vi.fn(),
}));

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
}));

describe('getInfo', () => {
  it('handles non-project / workspace locations in a ', () => {
    const name = `YourProjectName`;

    (fs.readFileSync as any)
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

    (execaSync as any).mockReturnValue({ stdout: '{}' });

    getInfo({ isWorkspace: true, name } as XcodeProjectInfo, 'some/path');

    // Should not call on Pods or the other misc groups
    expect(execaSync).toHaveBeenCalledWith('xcodebuild', [
      '-list',
      '-json',
      '-project',
      `some/path/${name}.xcodeproj`,
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
});
