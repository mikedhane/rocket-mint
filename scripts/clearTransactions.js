// Script to clear all transactions for a specific token
require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// Initialize Firebase Admin using environment variables
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "rocket-mint.firebasestorage.app"
});

const db = admin.firestore();

// Mint address for the token
const MINT_ADDRESS = "E5ga2JhF214tSCHihCaxnWTV514MXXLGUXhXYjkEi4DG";

async function clearTransactions() {
  console.log('🗑️  Clearing all transactions for token:', MINT_ADDRESS);
  console.log('');

  try {
    const snapshot = await db.collection('transactions')
      .where('mintAddress', '==', MINT_ADDRESS)
      .get();

    console.log(`Found ${snapshot.docs.length} transactions to delete`);

    if (snapshot.docs.length === 0) {
      console.log('✅ No transactions to delete!');
      process.exit(0);
      return;
    }

    // Delete in batches
    const batch = db.batch();
    let count = 0;

    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
      count++;
    });

    await batch.commit();

    console.log(`\n✅ Successfully deleted ${count} transactions!`);
    console.log('The transaction list should now be empty.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

clearTransactions();
