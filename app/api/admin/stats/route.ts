// app/api/admin/stats/route.ts
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { getDb } from "@/lib/firebaseAdmin";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export async function GET(req: Request) {
  try {
    // Check JWT authentication
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      console.log("Admin stats - UNAUTHORIZED: No token provided");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.authenticated) {
      console.log("Admin stats - UNAUTHORIZED: Invalid token");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Admin stats - Auth successful");

    const db = getDb();
    const snapshot = await db.collection("launches").get();

    let totalTokens = 0;
    let graduatedTokens = 0;
    let totalSolCollected = BigInt(0);
    let totalPlatformFees = BigInt(0);
    let totalCreatorFees = BigInt(0);
    let totalTokensSold = BigInt(0);

    const recentLaunches: any[] = [];

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      totalTokens++;

      if (data.graduated) {
        graduatedTokens++;
      }

      // Calculate fees and volume
      if (data.curveState) {
        const solCollected = BigInt(data.curveState.solCollected || "0");
        totalSolCollected += solCollected;

        // Estimate platform fees (1% of SOL collected)
        const platformFeeBps = data.bondingCurve?.platformFeeBps || 100;
        const platformFee = (solCollected * BigInt(platformFeeBps)) / BigInt(10000);
        totalPlatformFees += platformFee;

        // Estimate creator fees (1% of SOL collected)
        const creatorFeeBps = data.bondingCurve?.creatorFeeBps || 100;
        const creatorFee = (solCollected * BigInt(creatorFeeBps)) / BigInt(10000);
        totalCreatorFees += creatorFee;

        // Track tokens sold
        const tokensSold = BigInt(data.curveState.tokensSold || "0");
        totalTokensSold += tokensSold;
      }

      // Track recent launches
      if (recentLaunches.length < 10) {
        recentLaunches.push({
          name: data.name,
          symbol: data.symbol,
          mintAddress: data.mintAddress,
          createdAt: data.createdAt,
          solCollected: data.curveState?.solCollected || "0",
          graduated: data.graduated || false,
        });
      }
    });

    // Sort recent launches by date
    recentLaunches.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    return NextResponse.json({
      totalTokens,
      graduatedTokens,
      activeTokens: totalTokens - graduatedTokens,
      totalSolCollected: totalSolCollected.toString(),
      totalPlatformFees: totalPlatformFees.toString(),
      totalCreatorFees: totalCreatorFees.toString(),
      totalTokensSold: totalTokensSold.toString(),
      recentLaunches: recentLaunches.slice(0, 10),
      // Convert to SOL for display
      totalSolCollectedFormatted: (Number(totalSolCollected) / Number(LAMPORTS_PER_SOL)).toFixed(4),
      totalPlatformFeesFormatted: (Number(totalPlatformFees) / Number(LAMPORTS_PER_SOL)).toFixed(4),
      totalCreatorFeesFormatted: (Number(totalCreatorFees) / Number(LAMPORTS_PER_SOL)).toFixed(4),
    });
  } catch (error: any) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
