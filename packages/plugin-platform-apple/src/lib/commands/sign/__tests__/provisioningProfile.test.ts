import { extractCertificateName } from '../provisioningProfile.js';

describe('extractCertificateName', () => {
  it('should extract certificate name from subject string', () => {
    const subject =
      'C=US\nO=Apple Inc.\nOU=Apple Worldwide Developer Relations\nCN=Apple Development: John Doe (TEAMID1234)';
    expect(extractCertificateName(subject)).toBe(
      'Apple Development: John Doe (TEAMID1234)'
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
});
