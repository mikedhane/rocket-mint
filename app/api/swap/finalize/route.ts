// app/api/swap/finalize/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import {
  Connection,
  Keypair,
  Transaction,
} from "@solana/web3.js";

type SolanaNetwork = "devnet" | "mainnet-beta" | "testnet";

/**
 * Finalize swap transaction by adding reserve wallet signature
 * after user (Phantom) has signed first
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mintAddress, signedTransaction, network } = body;

    if (!mintAddress || !signedTransaction) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get token data from Firestore to get reserve wallet
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

    if (!data.reservePrivateKey) {
      return NextResponse.json(
        { error: "Reserve wallet not found" },
        { status: 400 }
      );
    }

    // Decode reserve wallet private key
    const reserveSecretKey = Uint8Array.from(
      Buffer.from(data.reservePrivateKey, "base64")
    );
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

    // Deserialize the user-signed transaction
    const txBuffer = Buffer.from(signedTransaction, "base64");
    const tx = Transaction.from(txBuffer);

    // Add reserve wallet signature (Phantom signed first, now we sign)
    tx.partialSign(reserveWallet);

    // Send the fully-signed transaction
    const signature = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });

    return NextResponse.json({
      ok: true,
      signature,
    });
  } catch (e: any) {
    console.error("Swap finalize error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Finalize failed" },
      { status: 500 }
    );
  }
}
