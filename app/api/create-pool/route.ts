// app/api/create-pool/route.ts
// Creates a Raydium liquidity pool for graduated tokens
// This runs asynchronously after a token graduates
export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max for pool creation

import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { decryptPrivateKey, isKeyEncrypted } from "@/lib/kmsEncryption";
import { createRaydiumPool } from "@/lib/raydiumLP";

type SolanaNetwork = "devnet" | "mainnet-beta" | "testnet";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mintAddress, network } = body;

    if (!mintAddress) {
      return NextResponse.json(
        { error: "Missing mintAddress" },
        { status: 400 }
      );
    }

    console.log(`[Pool Creation] Starting for token: ${mintAddress}`);

    // Get token data from Firestore
    const db = getDb();
    const snapshot = await db
      .collection("launches")
      .where("mintAddress", "==", mintAddress)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    // Check if already graduated with a pool
    if (data.poolId) {
      return NextResponse.json(
        {
          ok: true,
          message: "Pool already exists",
          poolId: data.poolId,
          lpMint: data.lpMint,
        },
        { status: 200 }
      );
    }

    // Check if graduated
    if (!data.graduated) {
      return NextResponse.json(
        { error: "Token has not graduated yet" },
        { status: 400 }
      );
    }

    // Decrypt reserve wallet
    let reserveSecretKey: Uint8Array;

    if (isKeyEncrypted(data)) {
      try {
        reserveSecretKey = await decryptPrivateKey(data.reservePrivateKey);
        console.log("[KMS] Successfully decrypted reserve private key for pool creation");
      } catch (error: any) {
        console.error("[KMS] Failed to decrypt private key:", error.message);
        return NextResponse.json(
          { error: `Failed to decrypt private key: ${error.message}` },
          { status: 500 }
        );
      }
    } else {
      console.warn("[KMS] Using legacy unencrypted private key");
      reserveSecretKey = Uint8Array.from(
        Buffer.from(data.reservePrivateKey, "base64")
      );
    }

    const reserveWallet = Keypair.fromSecretKey(reserveSecretKey);

    // Get RPC endpoint
    const getEndpoint = (net: SolanaNetwork) => {
      if (net === "mainnet-beta") return "https://solana-mainnet.g.alchemy.com/v2/RVeMfinzUHGfNq_Alf3VR";
      if (net === "testnet") return "https://api.testnet.solana.com";
      return "https://solana-devnet.g.alchemy.com/v2/RVeMfinzUHGfNq_Alf3VR";
    };

    const connection = new Connection(
      getEndpoint((network as SolanaNetwork) || "devnet"),
      "confirmed"
    );

    // Calculate how much liquidity to add to the pool
    // Use ALL remaining tokens in the reserve
    const tokensForPool = BigInt(data.curveState.tokensRemaining);

    // Use ALL SOL collected in the bonding curve
    const solForPool = BigInt(data.curveState.solCollected);

    console.log(`[Pool Creation] Token amount: ${tokensForPool.toString()}`);
    console.log(`[Pool Creation] SOL amount: ${Number(solForPool) / LAMPORTS_PER_SOL} SOL`);

    // Raydium only supports devnet and mainnet-beta (no testnet)
    const raydiumNetwork: "devnet" | "mainnet-beta" =
      network === "mainnet-beta" ? "mainnet-beta" : "devnet";

    // Create the Raydium pool
    const result = await createRaydiumPool(connection, {
      tokenMint: new PublicKey(mintAddress),
      tokenAmount: tokensForPool,
      solAmount: solForPool,
      reserveWallet,
      network: raydiumNetwork,
    });

    console.log(`[Pool Creation] ✅ Success!`);
    console.log(`[Pool Creation] Pool ID: ${result.poolId}`);
    console.log(`[Pool Creation] LP Mint: ${result.lpMint}`);
    console.log(`[Pool Creation] TX: ${result.txSignature}`);
    if (result.burnTxSignature) {
      console.log(`[Pool Creation] Burn TX: ${result.burnTxSignature}`);
    }

    // Update Firestore with pool info
    await db.collection("launches").doc(doc.id).update({
      poolId: result.poolId,
      lpMint: result.lpMint,
      poolCreatedAt: new Date().toISOString(),
      poolCreationTx: result.txSignature,
      lpTokensBurned: !!result.burnTxSignature,
      lpBurnTx: result.burnTxSignature || null,
    });

    return NextResponse.json({
      ok: true,
      poolId: result.poolId,
      lpMint: result.lpMint,
      txSignature: result.txSignature,
      burnTxSignature: result.burnTxSignature,
    });
  } catch (error: any) {
    console.error("[Pool Creation] Error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Pool creation failed" },
      { status: 500 }
    );
  }
}
