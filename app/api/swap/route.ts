// app/api/swap/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
} from "@solana/spl-token";
import {
  BondingCurveConfig,
  BondingCurveState,
  calculateTokensForSol,
  calculateSolForTokens,
  lamportsToSol,
} from "@/lib/bondingCurve";
import {
  distributeReferralCommissions,
  calculateTradingFeesUSD,
} from "@/lib/referralCommissions";

type SolanaNetwork = "devnet" | "mainnet-beta" | "testnet";

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
 * Calculate graduation threshold in lamports based on target USD value
 * All networks use $1M USD graduation threshold
 */
async function getGraduationThresholdLamports(): Promise<bigint> {
  const solPriceUSD = await getSolPriceUSD();

  // Target USD values - $1M for all networks
  const targetUSD = 1_000_000;

  // Calculate SOL needed to reach target USD value
  const solNeeded = targetUSD / solPriceUSD;
  const lamportsNeeded = Math.floor(solNeeded * LAMPORTS_PER_SOL);

  console.log(`Graduation threshold: ${solNeeded.toFixed(2)} SOL ($${targetUSD.toLocaleString()} USD at $${solPriceUSD}/SOL)`);

  return BigInt(lamportsNeeded);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mintAddress, userWallet, mode, amount, network } = body;

    if (!mintAddress || !userWallet || !mode || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

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

    if (!data.reservePrivateKey || !data.bondingCurve || !data.curveState) {
      return NextResponse.json(
        { error: "Bonding curve not configured for this token" },
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

    const config: BondingCurveConfig = {
      totalSupply: BigInt(data.bondingCurve.totalSupply),
      initialPrice: data.bondingCurve.initialPrice,
      finalPrice: data.bondingCurve.finalPrice,
      platformFeeBps: data.bondingCurve.platformFeeBps,
      creatorFeeBps: data.bondingCurve.creatorFeeBps,
    };

    const state: BondingCurveState = {
      tokensRemaining: BigInt(data.curveState.tokensRemaining),
      tokensSold: BigInt(data.curveState.tokensSold),
      solCollected: BigInt(data.curveState.solCollected),
    };

    const tx = new Transaction();

    // Add compute budget instructions to help with transaction simulation
    tx.add(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: 300_000, // Sufficient compute units for buy/sell transactions
      })
    );

    tx.add(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 1000, // Add priority fee
      })
    );

    const mintPubkey = new PublicKey(mintAddress);
    const userPubkey = new PublicKey(userWallet);
    const platformTreasury = new PublicKey(
      process.env.NEXT_PUBLIC_PLATFORM_TREASURY || reserveWallet.publicKey.toBase58()
    );
    const creatorPubkey = new PublicKey(data.creator);

    let newState: BondingCurveState;
    let platformFeeLamports = BigInt(0);
    let creatorFeeLamports = BigInt(0);

    if (mode === "buy") {
      // Buy tokens with SOL
      const solAmount = BigInt(Math.floor(Number(amount) * LAMPORTS_PER_SOL));

      const result = calculateTokensForSol(config, state, solAmount);

      if (result.tokensReceived > state.tokensRemaining) {
        return NextResponse.json(
          { error: "Not enough tokens remaining in curve" },
          { status: 400 }
        );
      }

      // Track fees for referral commission distribution
      platformFeeLamports = result.platformFee;
      creatorFeeLamports = result.creatorFee;

      // User pays SOL to reserve
      tx.add(
        SystemProgram.transfer({
          fromPubkey: userPubkey,
          toPubkey: reserveWallet.publicKey,
          lamports: Number(result.netSol),
        })
      );

      // Platform fee
      if (result.platformFee > BigInt(0)) {
        tx.add(
          SystemProgram.transfer({
            fromPubkey: userPubkey,
            toPubkey: platformTreasury,
            lamports: Number(result.platformFee),
          })
        );
      }

      // Creator fee
      if (result.creatorFee > BigInt(0)) {
        tx.add(
          SystemProgram.transfer({
            fromPubkey: userPubkey,
            toPubkey: creatorPubkey,
            lamports: Number(result.creatorFee),
          })
        );
      }

      // Get/create user's token account
      const userAta = getAssociatedTokenAddressSync(
        mintPubkey,
        userPubkey,
        false,
        TOKEN_PROGRAM_ID
      );

      const ataInfo = await connection.getAccountInfo(userAta);
      if (!ataInfo) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            userPubkey, // payer
            userAta,
            userPubkey,
            mintPubkey,
            TOKEN_PROGRAM_ID
          )
        );
      }

      // Transfer tokens from reserve to user
      const reserveAta = getAssociatedTokenAddressSync(
        mintPubkey,
        reserveWallet.publicKey,
        false,
        TOKEN_PROGRAM_ID
      );

      tx.add(
        createTransferInstruction(
          reserveAta,
          userAta,
          reserveWallet.publicKey,
          Number(result.tokensReceived),
          [],
          TOKEN_PROGRAM_ID
        )
      );

      newState = {
        tokensRemaining: state.tokensRemaining - result.tokensReceived,
        tokensSold: state.tokensSold + result.tokensReceived,
        solCollected: state.solCollected + result.netSol,
      };
    } else {
      // Sell tokens for SOL
      const tokenAmount = BigInt(Math.floor(Number(amount) * 1_000_000)); // Assuming 6 decimals

      const result = calculateSolForTokens(config, state, tokenAmount);

      // Track fees for referral commission distribution
      platformFeeLamports = result.platformFee;
      creatorFeeLamports = result.creatorFee;

      // Transfer tokens from user to reserve
      const userAta = getAssociatedTokenAddressSync(
        mintPubkey,
        userPubkey,
        false,
        TOKEN_PROGRAM_ID
      );

      const reserveAta = getAssociatedTokenAddressSync(
        mintPubkey,
        reserveWallet.publicKey,
        false,
        TOKEN_PROGRAM_ID
      );

      tx.add(
        createTransferInstruction(
          userAta,
          reserveAta,
          userPubkey,
          Number(tokenAmount),
          [],
          TOKEN_PROGRAM_ID
        )
      );

      // Reserve pays SOL to user
      tx.add(
        SystemProgram.transfer({
          fromPubkey: reserveWallet.publicKey,
          toPubkey: userPubkey,
          lamports: Number(result.solReceived),
        })
      );

      // Deduct fees from reserve (they already have the SOL)
      if (result.platformFee > BigInt(0)) {
        tx.add(
          SystemProgram.transfer({
            fromPubkey: reserveWallet.publicKey,
            toPubkey: platformTreasury,
            lamports: Number(result.platformFee),
          })
        );
      }

      if (result.creatorFee > BigInt(0)) {
        tx.add(
          SystemProgram.transfer({
            fromPubkey: reserveWallet.publicKey,
            toPubkey: creatorPubkey,
            lamports: Number(result.creatorFee),
          })
        );
      }

      newState = {
        tokensRemaining: state.tokensRemaining + tokenAmount,
        tokensSold: state.tokensSold - tokenAmount,
        solCollected: state.solCollected - result.grossSol,
      };
    }

    // Set up transaction
    tx.feePayer = userPubkey;
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;

    // Reserve wallet signs (for token transfers)
    tx.partialSign(reserveWallet);

    // Serialize and return for user to sign
    const serialized = tx.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    // Check if bonding curve is complete (graduated)
    // Graduate when $1M USD worth of SOL is collected
    // Uses current SOL/USD price to calculate dynamic threshold
    const graduationThresholdLamports = await getGraduationThresholdLamports();
    const isGraduated = newState.solCollected >= graduationThresholdLamports;

    if (isGraduated && !data.graduated) {
      console.log(`💰 Token ${mintAddress} collected ${lamportsToSol(newState.solCollected)} SOL - GRADUATED!`);
    }

    // Update curve state in Firestore
    const updateData: any = {
      curveState: {
        tokensRemaining: newState.tokensRemaining.toString(),
        tokensSold: newState.tokensSold.toString(),
        solCollected: newState.solCollected.toString(),
      },
    };

    // Mark as graduated if curve is complete
    if (isGraduated && !data.graduated) {
      updateData.graduated = true;
      updateData.graduatedAt = new Date().toISOString();
      console.log(`🎓 Token ${mintAddress} has GRADUATED! Creating liquidity pool...`);
    }

    await db.collection("launches").doc(doc.id).update(updateData);

    // Record transaction in history for price chart
    // Calculate price per token from the newState
    const tokensDelta = newState.tokensSold - state.tokensSold; // positive for buy, negative for sell
    const solDelta = newState.solCollected - state.solCollected; // positive for buy, negative for sell
    const currentPrice = Math.abs(Number(solDelta)) / Math.abs(Number(tokensDelta)) / LAMPORTS_PER_SOL * 1_000_000; // Price per token (6 decimals)

    await db.collection("transactions").add({
      mintAddress,
      type: mode, // "buy" or "sell"
      price: currentPrice, // Price in SOL per token
      tokenAmount: Math.abs(Number(tokensDelta)).toString(),
      solAmount: Math.abs(Number(solDelta)).toString(),
      user: userWallet,
      timestamp: new Date().toISOString(),
      network: network || "devnet",
    });

    // Distribute referral commissions based on trading fees
    if (platformFeeLamports > BigInt(0) || creatorFeeLamports > BigInt(0)) {
      try {
        const solPriceUSD = await getSolPriceUSD();
        const totalFeesUSD = calculateTradingFeesUSD(
          platformFeeLamports,
          creatorFeeLamports,
          solPriceUSD
        );

        // Distribute commissions to referrers (35%, 20%, 5%)
        await distributeReferralCommissions(userWallet, totalFeesUSD);
      } catch (commissionError) {
        console.error("Error distributing referral commissions:", commissionError);
        // Don't fail the transaction if commission distribution fails
      }
    }

    return NextResponse.json({
      ok: true,
      transaction: Buffer.from(serialized).toString("base64"),
      blockhash,
      lastValidBlockHeight,
      newState: {
        tokensRemaining: newState.tokensRemaining.toString(),
        tokensSold: newState.tokensSold.toString(),
        solCollected: newState.solCollected.toString(),
      },
    });
  } catch (e: any) {
    console.error("Swap error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Swap failed" },
      { status: 500 }
    );
  }
}
