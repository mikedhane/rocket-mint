import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mintAddress = searchParams.get("mint");
    const network = searchParams.get("network") || "devnet";

    if (!mintAddress) {
      return NextResponse.json(
        { error: "mint parameter is required" },
        { status: 400 }
      );
    }

    const mintPubkey = new PublicKey(mintAddress);

    // Use public Solana RPC (supports getProgramAccounts)
    const publicRpcUrl = network === "mainnet-beta"
      ? "https://api.mainnet-beta.solana.com"
      : "https://api.devnet.solana.com";

    const publicConnection = new Connection(publicRpcUrl, "confirmed");
    console.log(`[Holder Count] Fetching holders for mint ${mintAddress} on ${network}`);

    // Get all token accounts for this mint
    const accounts = await publicConnection.getProgramAccounts(
      TOKEN_PROGRAM_ID,
      {
        filters: [
          {
            dataSize: 165, // Size of token account
          },
          {
            memcmp: {
              offset: 0, // Mint address is at offset 0
              bytes: mintPubkey.toBase58(),
            },
          },
        ],
      }
    );

    // Count accounts with non-zero balance
    let holders = 0;
    for (const account of accounts) {
      // Token amount is stored at offset 64 as u64 (8 bytes)
      const amount = account.account.data.readBigUInt64LE(64);
      if (amount > BigInt(0)) {
        holders++;
      }
    }

    console.log(`[Holder Count] Found ${holders} holders out of ${accounts.length} total accounts`);
    return NextResponse.json({ holderCount: holders });
  } catch (error: any) {
    console.error("Error fetching holder count:", error);
    return NextResponse.json(
      { error: "Failed to fetch holder count", holderCount: 0 },
      { status: 500 }
    );
  }
}
