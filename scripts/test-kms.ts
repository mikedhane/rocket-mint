// scripts/test-kms.ts
// Test script to verify Google Cloud KMS encryption/decryption

import { Keypair } from '@solana/web3.js';
import { encryptPrivateKey, decryptPrivateKey } from '../lib/kmsEncryption';

async function testKMSEncryption() {
  console.log('🔐 Testing Google Cloud KMS Encryption/Decryption...\n');

  try {
    // Step 1: Generate a test Solana keypair
    console.log('1️⃣ Generating test Solana keypair...');
    const testKeypair = Keypair.generate();
    const originalPrivateKey = testKeypair.secretKey;
    const originalBase64 = Buffer.from(originalPrivateKey).toString('base64');
    console.log(`   ✅ Generated keypair with public key: ${testKeypair.publicKey.toBase58()}`);
    console.log(`   📝 Original private key (base64, first 20 chars): ${originalBase64.substring(0, 20)}...\n`);

    // Step 2: Encrypt the private key using KMS
    console.log('2️⃣ Encrypting private key with Google Cloud KMS...');
    const encryptedKey = await encryptPrivateKey(originalBase64);
    console.log(`   ✅ Encrypted successfully`);
    console.log(`   📝 Encrypted key (base64, first 40 chars): ${encryptedKey.substring(0, 40)}...\n`);

    // Step 3: Decrypt the private key using KMS
    console.log('3️⃣ Decrypting private key with Google Cloud KMS...');
    const decryptedKey = await decryptPrivateKey(encryptedKey);
    console.log(`   ✅ Decrypted successfully`);
    console.log(`   📝 Decrypted ${decryptedKey.length} bytes\n`);

    // Step 4: Verify the decrypted key matches the original
    console.log('4️⃣ Verifying decrypted key matches original...');
    const decryptedBase64 = Buffer.from(decryptedKey).toString('base64');

    if (originalBase64 === decryptedBase64) {
      console.log(`   ✅ SUCCESS! Decrypted key matches original perfectly\n`);
    } else {
      console.log(`   ❌ ERROR! Decrypted key does not match original`);
      console.log(`   Original length: ${originalPrivateKey.length}`);
      console.log(`   Decrypted length: ${decryptedKey.length}`);
      process.exit(1);
    }

    // Step 5: Verify we can create a valid Solana keypair from the decrypted key
    console.log('5️⃣ Creating Solana keypair from decrypted key...');
    const restoredKeypair = Keypair.fromSecretKey(decryptedKey);
    console.log(`   ✅ Created keypair with public key: ${restoredKeypair.publicKey.toBase58()}`);

    if (testKeypair.publicKey.toBase58() === restoredKeypair.publicKey.toBase58()) {
      console.log(`   ✅ SUCCESS! Public keys match - keypair fully restored\n`);
    } else {
      console.log(`   ❌ ERROR! Public keys do not match`);
      process.exit(1);
    }

    console.log('🎉 All tests passed! Google Cloud KMS encryption is working correctly.\n');
    console.log('📊 Summary:');
    console.log(`   - Original keypair public key: ${testKeypair.publicKey.toBase58()}`);
    console.log(`   - Restored keypair public key: ${restoredKeypair.publicKey.toBase58()}`);
    console.log(`   - Encryption/Decryption: ✅ Working`);
    console.log(`   - Keypair restoration: ✅ Working\n`);

  } catch (error: any) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testKMSEncryption();
