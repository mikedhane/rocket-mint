// app/api/creator-earnings/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";

/**
 * Calculate total creator earnings from trading fees for a specific token
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mintAddress = searchParams.get("mintAddress");

    if (!mintAddress) {
      return NextResponse.json(
        { error: "Missing mintAddress parameter" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Get all transactions for this token
    const snapshot = await db
      .collection("transactions")
      .where("mintAddress", "==", mintAddress)
      .get();

    let totalCreatorFeesLamports = BigInt(0);
    let transactionCount = 0;

    // Sum up all creator fees
    snapshot.forEach((doc) => {
      const data = doc.data();

      // Check if this transaction has creator fee data
      // (transactions recorded after the fee tracking was implemented)
      if (data.creatorFeeLamports) {
        totalCreatorFeesLamports += BigInt(data.creatorFeeLamports);
        transactionCount++;
      }
    });

    // Convert lamports to SOL (1 SOL = 1,000,000,000 lamports)
    const totalCreatorFeesSOL = Number(totalCreatorFeesLamports) / 1_000_000_000;

    return NextResponse.json({
      mintAddress,
      totalCreatorFeesSOL,
      totalCreatorFeesLamports: totalCreatorFeesLamports.toString(),
      transactionCount,
    });
  } catch (e: any) {
    console.error("Creator earnings calculation error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to calculate creator earnings" },
      { status: 500 }
    );
  }
}
