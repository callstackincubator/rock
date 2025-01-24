import * as fs from 'node:fs';
import { spawn } from '@rnef/tools';
import type { Mock } from 'vitest';
import { describe, expect, it, vi } from 'vitest';
import type { XcodeProjectInfo } from '../../types/index.js';
import { getInfo } from '../getInfo.js';

const projectsOutput = `{
  "project" : {
    "configurations" : [
      "Debug",
      "Test",
      "Release"
    ],
    "name" : "YourProjectName",
    "schemes" : [
      "YourProjectName-Dev",
      "YourProjectName-Prod",
      "NotificationService",
      "TodayWidget"
    ],
    "targets" : [
      "YourProjectName",
      "YourProjectNameTests",
      "TodayWidget",
      "NotificationService"
    ]
  }
}`;

const workspaceDataFileContents = `<?xml version="1.0" encoding="UTF-8"?>
<Workspace
   version = "1.0">
   <FileRef
      location = "group:YourProjectName.xcodeproj">
   </FileRef>
   <FileRef
      location = "group:Pods/Pods.xcodeproj">
   </FileRef>
   <FileRef
      location = "group:container/some_other_file.mm">
   </FileRef>
   <FileRef
      location = "group:storekit/file.storekit">
   </FileRef>
</Workspace>`;

describe('getInfo', () => {
  it('handles non-project / workspace locations in a ', async () => {
    vi.mocked(fs.readFileSync).mockReturnValueOnce(workspaceDataFileContents);

    (spawn as Mock).mockResolvedValue({ stdout: projectsOutput });

    const info = await getInfo(
      { isWorkspace: true, name: 'YourProjectName' } as XcodeProjectInfo,
      'some/path'
    );

    // Should not call on Pods or the other misc groups
    expect(spawn).toHaveBeenCalledWith(
      'xcodebuild',
      ['-list', '-json', '-project', `some/path/YourProjectName.xcodeproj`],
      { stdio: ['ignore', 'pipe', 'inherit'], cwd: 'some/path' }
    );
    expect(spawn).toHaveBeenCalledTimes(1);

    expect(info).toMatchInlineSnapshot(`
      {
        "configurations": [
          "Debug",
          "Test",
          "Release",
        ],
        "name": "YourProjectName",
        "schemes": [
          "YourProjectName-Dev",
          "YourProjectName-Prod",
          "NotificationService",
          "TodayWidget",
        ],
        "targets": [
          "YourProjectName",
          "YourProjectNameTests",
          "TodayWidget",
          "NotificationService",
        ],
      }
    `);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });
});
