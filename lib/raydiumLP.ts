// Raydium Liquidity Pool Creation
// Creates and initializes a Raydium AMM pool for graduated tokens

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getMint,
  createBurnInstruction,
} from "@solana/spl-token";
import { Raydium, TxVersion, parseTokenAccountResp } from "@raydium-io/raydium-sdk-v2";
import BN from "bn.js";

/**
 * Configuration for creating a liquidity pool
 */
export interface PoolCreationConfig {
  tokenMint: PublicKey;
  tokenAmount: bigint; // Amount of tokens to add to pool (in base units)
  solAmount: bigint; // Amount of SOL to add to pool (in lamports)
  reserveWallet: Keypair;
  network: "devnet" | "mainnet-beta";
}

/**
 * Result of pool creation
 */
export interface PoolCreationResult {
  poolId: string;
  lpMint: string;
  txSignature: string;
  burnTxSignature?: string; // Signature of LP token burn transaction
}

/**
 * Initialize Raydium SDK instance
 */
async function initializeRaydium(
  connection: Connection,
  owner: Keypair,
  network: "devnet" | "mainnet-beta"
): Promise<Raydium> {
  const cluster = network === "mainnet-beta" ? "mainnet" : "devnet";

  const raydium = await Raydium.load({
    owner,
    connection,
    cluster,
    disableFeatureCheck: true,
    disableLoadToken: false,
    blockhashCommitment: "finalized",
  });

  return raydium;
}

/**
 * Create a Raydium AMM liquidity pool for a graduated token
 * @param connection - Solana connection
 * @param config - Pool creation configuration
 * @returns Pool creation result with pool ID and transaction signature
 */
export async function createRaydiumPool(
  connection: Connection,
  config: PoolCreationConfig
): Promise<PoolCreationResult> {
  console.log("[Raydium] Starting liquidity pool creation...");
  console.log(`[Raydium] Token: ${config.tokenMint.toBase58()}`);
  console.log(`[Raydium] Token Amount: ${config.tokenAmount.toString()}`);
  console.log(`[Raydium] SOL Amount: ${Number(config.solAmount) / LAMPORTS_PER_SOL} SOL`);

  try {
    // Initialize Raydium SDK
    const raydium = await initializeRaydium(
      connection,
      config.reserveWallet,
      config.network
    );

    // Get token mint info
    const tokenMintInfo = await getMint(
      connection,
      config.tokenMint,
      "confirmed",
      TOKEN_PROGRAM_ID
    );

    console.log(`[Raydium] Token decimals: ${tokenMintInfo.decimals}`);

    // Get or create token accounts for reserve wallet
    const reserveTokenAccount = getAssociatedTokenAddressSync(
      config.tokenMint,
      config.reserveWallet.publicKey,
      false,
      TOKEN_PROGRAM_ID
    );

    // SOL is wrapped as WSOL for the pool
    const wsolMint = new PublicKey("So11111111111111111111111111111111111111112");

    console.log("[Raydium] Creating AMM pool...");

    // Convert bigint to BN for Raydium SDK
    const baseAmountBN = new BN(config.tokenAmount.toString());
    const quoteAmountBN = new BN(config.solAmount.toString());

    // Create pool using Raydium SDK v2
    // Note: This creates a standard Raydium AMM pool
    const { execute, extInfo } = await raydium.liquidity.createPoolV4({
      programId: raydium.cluster === "mainnet"
        ? new PublicKey("675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8") // Raydium AMM Program (mainnet)
        : new PublicKey("HWy1jotHpo6UqeQxx49dpYYdQB8wj9Qk9MdxwjLvDHB8"), // Raydium AMM Program (devnet)
      marketInfo: {
        marketId: PublicKey.default, // Will be auto-created
        programId: PublicKey.default,
      },
      baseMintInfo: {
        mint: config.tokenMint,
        decimals: tokenMintInfo.decimals,
      },
      quoteMintInfo: {
        mint: wsolMint,
        decimals: 9, // SOL decimals
      },
      baseAmount: baseAmountBN,
      quoteAmount: quoteAmountBN,
      startTime: new BN(Math.floor(Date.now() / 1000)), // Start immediately
      ownerInfo: {
        useSOLBalance: true, // Use SOL directly instead of WSOL
      },
      associatedOnly: false,
      txVersion: TxVersion.V0, // Use versioned transaction
      feeDestinationId: PublicKey.default,
    });

    // Execute the transaction
    console.log("[Raydium] Executing pool creation transaction...");
    const { txId } = await execute({
      sendAndConfirm: true,
    });

    // Extract pool addresses from extInfo
    // The structure varies by SDK version, so we cast to any for flexibility
    const poolAddresses = (extInfo as any).address || extInfo;
    const poolId = poolAddresses.ammId || poolAddresses.poolId || poolAddresses.id;
    const lpMint = poolAddresses.lpMint;

    if (!poolId || !lpMint) {
      console.error("[Raydium] Pool addresses:", poolAddresses);
      throw new Error("Failed to get pool ID or LP mint from pool creation result");
    }

    console.log(`[Raydium] ✅ Pool created successfully!`);
    console.log(`[Raydium] Transaction: ${txId}`);
    console.log(`[Raydium] Pool ID: ${poolId.toBase58()}`);
    console.log(`[Raydium] LP Mint: ${lpMint.toBase58()}`);

    // Now burn the LP tokens to make liquidity permanent
    let burnTxSignature: string | undefined;
    try {
      console.log("[Raydium] Burning LP tokens to lock liquidity...");
      burnTxSignature = await burnLPTokens(
        connection,
        config.reserveWallet,
        lpMint
      );
      console.log(`[Raydium] ✅ LP tokens burned! Tx: ${burnTxSignature}`);
    } catch (burnError: any) {
      console.error("[Raydium] Failed to burn LP tokens:", burnError.message);
      console.warn("[Raydium] Pool created but LP tokens NOT burned - manual burn required!");
    }

    return {
      poolId: poolId.toBase58(),
      lpMint: lpMint.toBase58(),
      txSignature: txId,
      burnTxSignature,
    };
  } catch (error: any) {
    console.error("[Raydium] Pool creation failed:", error);
    throw new Error(`Failed to create Raydium pool: ${error.message}`);
  }
}

/**
 * Burn all LP tokens held by the reserve wallet to make liquidity permanent
 * This ensures the liquidity cannot be withdrawn (trustless pool)
 */
async function burnLPTokens(
  connection: Connection,
  wallet: Keypair,
  lpMint: PublicKey
): Promise<string> {
  console.log("[Raydium] Getting LP token account...");

  // Get wallet's LP token account
  const lpTokenAccount = getAssociatedTokenAddressSync(
    lpMint,
    wallet.publicKey,
    false,
    TOKEN_PROGRAM_ID
  );

  // Get LP token balance
  const lpAccountInfo = await connection.getTokenAccountBalance(lpTokenAccount);
  const lpBalance = BigInt(lpAccountInfo.value.amount);

  if (lpBalance === BigInt(0)) {
    throw new Error("No LP tokens to burn");
  }

  console.log(`[Raydium] LP Balance: ${lpBalance.toString()}`);
  console.log("[Raydium] Creating burn transaction...");

  // Create burn transaction
  const tx = new Transaction();

  tx.add(
    createBurnInstruction(
      lpTokenAccount,
      lpMint,
      wallet.publicKey,
      lpBalance,
      [],
      TOKEN_PROGRAM_ID
    )
  );

  // Send and confirm transaction
  const signature = await connection.sendTransaction(tx, [wallet], {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  await connection.confirmTransaction(signature, "confirmed");

  console.log(`[Raydium] ✅ Burned ${lpBalance.toString()} LP tokens`);
  return signature;
}

/**
 * Check if a token has already graduated and has a pool
 */
export function hasGraduated(tokenData: any): boolean {
  return tokenData.graduated === true && !!tokenData.poolId;
}
