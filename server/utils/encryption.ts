import crypto from 'crypto';

// Use environment variable or fallback to a default key (should be set in production)
const ENCRYPTION_KEY = process.env.OAUTH_ENCRYPTION_KEY || 'dev-encryption-key-32-characters!';

// Ensure key is 32 bytes for AES-256
const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Return IV and encrypted data combined
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted text format');
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Test the encryption/decryption
export function testEncryption(): boolean {
  try {
    const testString = 'test-oauth-token-123';
    const encrypted = encrypt(testString);
    const decrypted = decrypt(encrypted);
    return decrypted === testString;
  } catch (error) {
    console.error('Encryption test failed:', error);
    return false;
  }
}