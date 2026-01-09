import type * as FsType from 'node:fs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from '@rock-js/tools';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from 'vitest';
import { extractCertificateName } from '../provisioningProfile.js';
import { mergeEntitlements } from '../provisioningProfile.js';

const actualFs = await vi.importActual<typeof FsType>('node:fs');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getFixturePath(filename: string): string {
  return path.join(__dirname, '__fixtures__', filename);
}

describe('mergeEntitlements', () => {
  let profileEntitlements: string;
  let appEntitlements: string;
  let tempDir: string;
  const fileContents: Map<string, string> = new Map();

  beforeEach(() => {
    vi.clearAllMocks();

    // Read fixtures using the actual fs module (bypass mock)
    profileEntitlements = actualFs.readFileSync(
      getFixturePath('test-profile-entitlements.plist'),
      'utf8',
    );
    appEntitlements = actualFs.readFileSync(
      getFixturePath('test-app-entitlements.plist'),
      'utf8',
    );

    // Create a real temp directory
    tempDir = actualFs.mkdtempSync(path.join(os.tmpdir(), 'rock-test-'));

    // Mock fs functions used by mergeEntitlements
    vi.mocked(fs.mkdtempSync).mockReturnValue(tempDir);
    vi.mocked(fs.writeFileSync).mockImplementation(
      (
        filePath: FsType.PathOrFileDescriptor,
        data: string | NodeJS.ArrayBufferView,
      ) => {
        fileContents.set(filePath.toString(), data.toString());
      },
    );
    vi.mocked(fs.readFileSync).mockImplementation(
      (filePath: FsType.PathOrFileDescriptor) => {
        const content = fileContents.get(filePath.toString());
        if (content !== undefined) {
          return content;
        }
        return actualFs.readFileSync(filePath, 'utf8');
      },
    );
    vi.mocked(fs.rmSync).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.resetAllMocks();
    fileContents.clear();
    if (tempDir && actualFs.existsSync(tempDir)) {
      actualFs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  function mockPlistBuddy(appEntitlementValues: Record<string, string>): void {
    (spawn as Mock).mockImplementation((file: string, args: string[]) => {
      if (file !== '/usr/libexec/PlistBuddy') {
        return { stdout: '', stderr: '' };
      }

      const commandArg = args.find((_, i) => args[i - 1] === '-c');
      if (!commandArg) {
        return { stdout: '', stderr: '' };
      }

      const plistPath = args[args.length - 1];

      // Handle Print commands (reading keys)
      if (commandArg.startsWith('Print:')) {
        const key = commandArg.replace('Print:', '');
        if (key in appEntitlementValues) {
          return { stdout: appEntitlementValues[key], stderr: '' };
        }
        throw { stderr: `Print: Entry, "${key}", Does Not Exist` };
      }

      // Handle Set/Add commands (writing keys)
      if (commandArg.startsWith('Set :') || commandArg.startsWith('Add :')) {
        const match = commandArg.match(/^(?:Set|Add) :([^\s]+) (.+)$/);
        if (match) {
          const [, key, value] = match;
          const content = fileContents.get(plistPath);
          if (content) {
            const updated = content.replace(
              '</dict>',
              `    <key>${key}</key>\n    ${value}\n</dict>`,
            );
            fileContents.set(plistPath, updated);
          }
        }
        return { stdout: '', stderr: '' };
      }

      return { stdout: '', stderr: '' };
    });
  }

  it('should transfer app entitlements to profile based on transfer rules', async () => {
    const appEntitlementValues: Record<string, string> = {
      'keychain-access-groups': '<array><string>TEAM123.*</string></array>',
      'com.apple.developer.icloud-services':
        '<array><string>CloudDocuments</string><string>CloudKit</string></array>',
      'com.apple.developer.associated-domains':
        '<array><string>applinks:example.com</string></array>',
      'com.apple.security.application-groups':
        '<array><string>group.com.example.testapp</string></array>',
    };

    mockPlistBuddy(appEntitlementValues);

    const result = await mergeEntitlements(
      profileEntitlements,
      appEntitlements,
    );

    expect(result).not.toEqual(profileEntitlements);
    expect(result).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?>
      <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
      <plist version="1.0">
      <dict>
          <key>application-identifier</key>
          <string>NEWTEAM456.com.example.testapp</string>
          <key>com.apple.developer.team-identifier</key>
          <string>NEWTEAM456</string>
          <key>get-task-allow</key>
          <false/>
          <key>keychain-access-groups</key>
          <array>
              <string>NEWTEAM456.*</string>
          </array>
          <key>com.apple.developer.icloud-services</key>
          <array><string>CloudDocuments</string><string>CloudKit</string></array>
          <key>com.apple.security.application-groups</key>
          <array><string>group.com.example.testapp</string></array>
          <key>keychain-access-groups</key>
          <array><string>TEAM123.*</string></array>
          <key>com.apple.developer.associated-domains</key>
          <array><string>applinks:example.com</string></array>
      </dict>
      </plist>"
    `);
  });

  it('should preserve original profile entitlements when no app keys match', async () => {
    mockPlistBuddy({});

    const result = await mergeEntitlements(
      profileEntitlements,
      appEntitlements,
    );

    expect(result).toEqual(profileEntitlements);
  });

  it('should only transfer keys defined in transferRules', async () => {
    mockPlistBuddy({
      'keychain-access-groups': '<array><string>TEAM123.*</string></array>',
    });

    const result = await mergeEntitlements(
      profileEntitlements,
      appEntitlements,
    );

    // Only keychain-access-groups should be transferred
    expect(result).toContain('<key>keychain-access-groups</key>');
    expect(result).toContain('<string>TEAM123.*</string>');

    // Other transfer rule keys should not appear (they weren't in app entitlements)
    expect(result).not.toContain(
      '<key>com.apple.developer.icloud-services</key>',
    );
    expect(result).not.toContain(
      '<key>com.apple.developer.associated-domains</key>',
    );
  });
});

describe('extractCertificateName', () => {
  it('should extract certificate name from subject string', () => {
    const subject =
      'C=US\nO=Apple Inc.\nOU=Apple Worldwide Developer Relations\nCN=Apple Development: John Doe (TEAMID1234)';
    expect(extractCertificateName(subject)).toBe(
      'Apple Development: John Doe (TEAMID1234)',
    );
  });

  it('should return null if no CN field found', () => {
    const subject =
      'C=US\nO=Apple Inc.\nOU=Apple Worldwide Developer Relations';
    expect(extractCertificateName(subject)).toBeNull();
  });

  it('should handle empty string', () => {
    expect(extractCertificateName('')).toBeNull();
  });

  it('should handle certificate names with special characters', () => {
    const subject = 'CN=iPhone Distribution: Company Name (ABC1234567)';
    expect(extractCertificateName(subject)).toBe(
      'iPhone Distribution: Company Name (ABC1234567)',
    );
  });

  it('should extract name from multi-line subject with CN at the end', () => {
    const subject =
      'C=US\nST=California\nL=San Francisco\nO=Apple Inc.\nCN=Apple Development: Test User (XYZ9876543)';
    expect(extractCertificateName(subject)).toBe(
      'Apple Development: Test User (XYZ9876543)',
    );
  });

  it('should handle subject with only CN field', () => {
    const subject = 'CN=Apple Distribution: My App (TEAM123456)';
    expect(extractCertificateName(subject)).toBe(
      'Apple Distribution: My App (TEAM123456)',
    );
  });
});
