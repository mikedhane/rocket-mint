// app/api/total-creator-earnings/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";

/**
 * Calculate total creator earnings across all tokens on the network
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const network = searchParams.get("network") || "devnet";

    const db = getDb();

    // Get all transactions for this network
    const snapshot = await db
      .collection("transactions")
      .where("network", "==", network)
      .get();

    let totalCreatorFeesLamports = BigInt(0);
    let transactionCount = 0;

    // Sum up all creator fees
    snapshot.forEach((doc) => {
      const data = doc.data();

      // Check if this transaction has creator fee data
      if (data.creatorFeeLamports) {
        totalCreatorFeesLamports += BigInt(data.creatorFeeLamports);
        transactionCount++;
      }
    });

    // Convert lamports to SOL (1 SOL = 1,000,000,000 lamports)
    const totalCreatorFeesSOL = Number(totalCreatorFeesLamports) / 1_000_000_000;

    return NextResponse.json({
      network,
      totalCreatorFeesSOL,
      totalCreatorFeesLamports: totalCreatorFeesLamports.toString(),
      transactionCount,
    });
  } catch (e: any) {
    console.error("Total creator earnings calculation error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to calculate total creator earnings" },
      { status: 500 }
    );
  }
}
