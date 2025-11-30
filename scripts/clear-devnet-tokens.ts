// scripts/clear-devnet-tokens.ts
// Run this script to clear all devnet tokens from Firestore before going to production

import { getDb } from "../lib/firebaseAdmin";

async function clearDevnetTokens() {
  const db = getDb();

  console.log("🗑️  Clearing all tokens from Firestore...");

  try {
    // Get all documents in the launches collection
    const launchesRef = db.collection("launches");
    const snapshot = await launchesRef.get();

    if (snapshot.empty) {
      console.log("✅ No tokens found - database is already clean!");
      return;
    }

    console.log(`📊 Found ${snapshot.size} tokens to delete`);

    // Delete all documents in batches
    const batchSize = 500;
    const batches: any[] = [];
    let currentBatch = db.batch();
    let operationCount = 0;

    snapshot.docs.forEach((doc) => {
      currentBatch.delete(doc.ref);
      operationCount++;

      if (operationCount === batchSize) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        operationCount = 0;
      }
    });

    // Add the last batch if it has operations
    if (operationCount > 0) {
      batches.push(currentBatch);
    }

    // Commit all batches
    console.log(`🔄 Deleting in ${batches.length} batch(es)...`);
    await Promise.all(batches.map((batch) => batch.commit()));

    console.log("✅ Successfully cleared all devnet tokens!");
    console.log("🚀 Your database is now ready for mainnet-beta tokens");

  } catch (error) {
    console.error("❌ Error clearing tokens:", error);
    process.exit(1);
  }

  process.exit(0);
}

clearDevnetTokens();
