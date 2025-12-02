import { KeyManagementServiceClient } from '@google-cloud/kms';

// Initialize KMS client
const client = new KeyManagementServiceClient();

// KMS key configuration from environment variables
const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rocket-mint';
const locationId = 'global';
const keyRingId = 'rocket-mint-keys';
const keyId = 'reserve-wallet-key';

// Construct the full key name
const keyName = `projects/${projectId}/locations/${locationId}/keyRings/${keyRingId}/cryptoKeys/${keyId}`;

console.log(`[KMS] Using key: ${keyName}`);

/**
 * Encrypt a reserve wallet private key using Google Cloud KMS
 * @param privateKeyBase64 - The private key as a base64 string
 * @returns The encrypted private key as a base64 string
 */
export async function encryptPrivateKey(privateKeyBase64: string): Promise<string> {
  try {
    console.log(`[KMS] Encrypting private key...`);

    const [result] = await client.encrypt({
      name: keyName,
      plaintext: Buffer.from(privateKeyBase64, 'base64'),
    });

    if (!result.ciphertext) {
      throw new Error('KMS encryption returned no ciphertext');
    }

    const encrypted = Buffer.from(result.ciphertext).toString('base64');
    console.log(`[KMS] Encryption successful`);

    return encrypted;
  } catch (error: any) {
    console.error('[KMS] Encryption error:', error.message);
    throw new Error(`Failed to encrypt private key: ${error.message}`);
  }
}

/**
 * Decrypt a reserve wallet private key using Google Cloud KMS
 * @param encryptedBase64 - The encrypted private key as a base64 string
 * @returns The decrypted private key as a Uint8Array
 */
export async function decryptPrivateKey(encryptedBase64: string): Promise<Uint8Array> {
  try {
    console.log(`[KMS] Decrypting private key...`);

    const [result] = await client.decrypt({
      name: keyName,
      ciphertext: Buffer.from(encryptedBase64, 'base64'),
    });

    if (!result.plaintext) {
      throw new Error('KMS decryption returned no plaintext');
    }

    // Convert the decrypted bytes directly to Uint8Array for Solana keypair
    // Note: KMS returns the raw bytes we encrypted (which were already decoded from base64)
    const privateKey = new Uint8Array(result.plaintext);

    console.log(`[KMS] Decryption successful`);

    // Clear sensitive data from memory
    if (result.plaintext) {
      // Fill the buffer with zeros
      Buffer.from(result.plaintext).fill(0);
    }

    return privateKey;
  } catch (error: any) {
    console.error('[KMS] Decryption error:', error.message);
    throw new Error(`Failed to decrypt private key: ${error.message}`);
  }
}

/**
 * Check if a private key is encrypted (has encryption metadata)
 * @param data - The token data from Firestore
 * @returns True if the key is encrypted with KMS
 */
export function isKeyEncrypted(data: any): boolean {
  return data.encryptionMethod === 'gcp-kms';
}
