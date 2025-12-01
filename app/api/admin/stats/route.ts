// app/api/admin/stats/route.ts
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { getDb } from "@/lib/firebaseAdmin";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

/**
 * Fetch current SOL price in USD from CoinGecko API
 */
async function getSolPriceUSD(): Promise<number> {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { next: { revalidate: 60 } }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch SOL price");
    }

    const data = await response.json();
    const price = data?.solana?.usd;

    if (typeof price === "number" && price > 0) {
      return price;
    }

    throw new Error("Invalid price data");
  } catch (error) {
    console.warn("Failed to fetch SOL price, using fallback $100:", error);
    return 100;
  }
}

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

    // Get token statistics from launches collection
    const launchesSnapshot = await db.collection("launches").get();

    let totalTokens = 0;
    let graduatedTokens = 0;
    const recentLaunches: any[] = [];

    launchesSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      totalTokens++;

      if (data.graduated) {
        graduatedTokens++;
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

    // Get ACTUAL fees from transactions collection (not estimated)
    const transactionsSnapshot = await db.collection("transactions").get();

    let totalSolVolume = BigInt(0);
    let totalPlatformFees = BigInt(0);
    let totalCreatorFees = BigInt(0);

    transactionsSnapshot.docs.forEach((doc) => {
      const data = doc.data();

      // Sum actual trading volume (SOL amounts from buy/sell transactions)
      if (data.solAmount) {
        totalSolVolume += BigInt(data.solAmount);
      }

      // Sum actual platform fees collected
      if (data.platformFeeLamports) {
        totalPlatformFees += BigInt(data.platformFeeLamports);
      }

      // Sum actual creator fees collected
      if (data.creatorFeeLamports) {
        totalCreatorFees += BigInt(data.creatorFeeLamports);
      }
    });

    // Sort recent launches by date
    recentLaunches.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    // Get SOL price for USD conversion
    const solPriceUSD = await getSolPriceUSD();

    // Convert lamports to SOL
    const totalSolVolumeSOL = Number(totalSolVolume) / Number(LAMPORTS_PER_SOL);
    const totalPlatformFeesSOL = Number(totalPlatformFees) / Number(LAMPORTS_PER_SOL);
    const totalCreatorFeesSOL = Number(totalCreatorFees) / Number(LAMPORTS_PER_SOL);

    return NextResponse.json({
      totalTokens,
      graduatedTokens,
      activeTokens: totalTokens - graduatedTokens,
      totalSolVolume: totalSolVolume.toString(),
      totalPlatformFees: totalPlatformFees.toString(),
      totalCreatorFees: totalCreatorFees.toString(),
      recentLaunches: recentLaunches.slice(0, 10),
      // SOL amounts
      totalSolCollectedFormatted: totalSolVolumeSOL.toFixed(4),
      totalPlatformFeesFormatted: totalPlatformFeesSOL.toFixed(4),
      totalCreatorFeesFormatted: totalCreatorFeesSOL.toFixed(4),
      // USD amounts
      solPriceUSD,
      totalSolVolumeUSD: totalSolVolumeSOL * solPriceUSD,
      totalPlatformFeesUSD: totalPlatformFeesSOL * solPriceUSD,
      totalCreatorFeesUSD: totalCreatorFeesSOL * solPriceUSD,
    });
  } catch (error: any) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
