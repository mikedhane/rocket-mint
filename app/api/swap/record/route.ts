// app/api/swap/record/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import {
  distributeReferralCommissions,
  calculateTradingFeesUSD,
} from "@/lib/referralCommissions";

/**
 * Fetch current SOL price in USD from CoinGecko API
 * Falls back to $100 if API fails
 */
async function getSolPriceUSD(): Promise<number> {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { next: { revalidate: 60 } } // Cache for 60 seconds
    );

    if (!response.ok) {
      throw new Error("Failed to fetch SOL price");
    }

    const data = await response.json();
    const price = data?.solana?.usd;

    if (typeof price === "number" && price > 0) {
      console.log(`Current SOL price: $${price} USD`);
      return price;
    }

    throw new Error("Invalid price data");
  } catch (error) {
    console.warn("Failed to fetch SOL price, using fallback $100:", error);
    return 100; // Fallback price
  }
}

/**
 * Record confirmed transaction and distribute referral commissions
 * Called AFTER transaction is confirmed on-chain
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      mintAddress,
      userWallet,
      mode,
      price,
      tokenAmount,
      solAmount,
      platformFeeLamports,
      creatorFeeLamports,
      network,
    } = body;

    if (!mintAddress || !userWallet || !mode) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Record transaction in history for price chart
    await db.collection("transactions").add({
      mintAddress,
      type: mode, // "buy" or "sell"
      price: price, // Price in SOL per token
      tokenAmount: tokenAmount,
      solAmount: solAmount,
      user: userWallet,
      timestamp: new Date().toISOString(),
      network: network || "devnet",
      platformFeeLamports: platformFeeLamports || "0",
      creatorFeeLamports: creatorFeeLamports || "0",
    });

    console.log(`✅ Recorded ${mode} transaction for ${userWallet} on ${mintAddress}`);

    // Distribute referral commissions based on trading fees
    const platformFee = BigInt(platformFeeLamports || "0");
    const creatorFee = BigInt(creatorFeeLamports || "0");

    if (platformFee > BigInt(0) || creatorFee > BigInt(0)) {
      try {
        const solPriceUSD = await getSolPriceUSD();
        const totalFeesUSD = calculateTradingFeesUSD(
          platformFee,
          creatorFee,
          solPriceUSD
        );

        // Distribute commissions to referrers (35%, 20%, 5%)
        await distributeReferralCommissions(userWallet, totalFeesUSD);
      } catch (commissionError) {
        console.error("Error distributing referral commissions:", commissionError);
        // Don't fail if commission distribution fails
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Transaction recorded successfully",
    });
  } catch (e: any) {
    console.error("Record transaction error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to record transaction" },
      { status: 500 }
    );
  }
}
