import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mint: string }> }
) {
  try {
    const { mint } = await params;

    if (!mint) {
      return NextResponse.json({ error: "Mint address required" }, { status: 400 });
    }

    const db = getDb();

    // Find the token by mint address
    const snapshot = await db
      .collection("launches")
      .where("mintAddress", "==", mint)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    // Return token data with bonding curve config and state
    return NextResponse.json({
      mintAddress: data.mintAddress,
      name: data.name,
      symbol: data.symbol,
      description: data.description || "",
      imageUrl: data.imageUrl || null,
      network: data.network || "devnet",
      creator: data.creator || "",
      curveReserveWallet: data.curveReserveWallet || "",
      graduated: data.graduated || false,
      graduatedAt: data.graduatedAt || null,
      website: data.website || null,
      twitter: data.twitter || null,
      bondingCurve: data.bondingCurve || {
        totalSupply: "800000000000000", // 80% of 1B with 6 decimals
        initialPrice: 0.000000001, // SOL per token
        finalPrice: 0.001, // SOL per token
        platformFeeBps: 100, // 1%
        creatorFeeBps: 100, // 1%
      },
      curveState: data.curveState || {
        tokensRemaining: "800000000000000",
        tokensSold: "0",
        solCollected: "0",
      },
    });
  } catch (error: any) {
    console.error("Error fetching token:", error);
    return NextResponse.json(
      { error: "Failed to fetch token data" },
      { status: 500 }
    );
  }
}
