// app/api/graduation-target/route.ts
import { NextResponse } from "next/server";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

/**
 * Fetch current SOL price in USD from CoinGecko API
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
      return price;
    }

    throw new Error("Invalid price data");
  } catch (error) {
    console.warn("Failed to fetch SOL price, using fallback $100:", error);
    return 100; // Fallback price
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const network = searchParams.get("network") || "devnet";

    const solPriceUSD = await getSolPriceUSD();

    // Target USD values - $1 million for all networks
    const targetUSD = 1_000_000;

    // Calculate SOL needed to reach target USD value
    const solNeeded = targetUSD / solPriceUSD;
    const lamportsNeeded = Math.floor(solNeeded * LAMPORTS_PER_SOL);

    return NextResponse.json({
      targetUSD,
      solPriceUSD,
      solNeeded,
      lamportsNeeded: lamportsNeeded.toString(),
      network,
    });
  } catch (error: any) {
    console.error("Error calculating graduation target:", error);
    return NextResponse.json(
      { error: "Failed to calculate graduation target" },
      { status: 500 }
    );
  }
}
