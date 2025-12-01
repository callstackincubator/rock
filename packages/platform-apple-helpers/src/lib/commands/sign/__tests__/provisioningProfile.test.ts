import { extractCertificateName } from '../provisioningProfile.js';

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
    expect(extractCertificateName(subject)).toBe('iPhone Distribution: Company Name (ABC1234567)');
  });

  it('should extract name from multi-line subject with CN at the end', () => {
    const subject = 'C=US\nST=California\nL=San Francisco\nO=Apple Inc.\nCN=Apple Development: Test User (XYZ9876543)';
    expect(extractCertificateName(subject)).toBe('Apple Development: Test User (XYZ9876543)');
  });

  it('should handle subject with only CN field', () => {
    const subject = 'CN=Apple Distribution: My App (TEAM123456)';
    expect(extractCertificateName(subject)).toBe('Apple Distribution: My App (TEAM123456)');
  });
});

// Note: Integration tests for generateEntitlementsPlist would require proper mocking
// of system tools (codesign, PlistBuddy, fs operations) and are better suited for
// end-to-end testing or manual verification.
// 
// The use_app_entitlements functionality has been implemented and can be tested
// manually using: rock sign:ios path/to/app.ipa --use-app-entitlements