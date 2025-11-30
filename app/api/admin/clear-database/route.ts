// app/api/admin/clear-database/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";

export async function POST(request: NextRequest) {
  try {
    // Check admin password
    const { password } = await request.json();

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDb();

    console.log("🗑️  Clearing all tokens from Firestore...");

    // Get all documents in the launches collection
    const launchesRef = db.collection("launches");
    const snapshot = await launchesRef.get();

    if (snapshot.empty) {
      return NextResponse.json({
        success: true,
        message: "No tokens found - database is already clean!",
        deletedCount: 0,
      });
    }

    const totalDocs = snapshot.size;
    console.log(`📊 Found ${totalDocs} tokens to delete`);

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

    return NextResponse.json({
      success: true,
      message: "Successfully cleared all tokens!",
      deletedCount: totalDocs,
      batches: batches.length,
    });
  } catch (error) {
    console.error("❌ Error clearing tokens:", error);
    return NextResponse.json(
      { error: "Failed to clear database", details: String(error) },
      { status: 500 }
    );
  }
}
