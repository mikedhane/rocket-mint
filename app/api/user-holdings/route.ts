import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAccount, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";

// Helper function to calculate current price from bonding curve
function getCurrentPrice(bondingCurve: any, tokensSold: bigint): number {
  const k = Number(bondingCurve.k);
  const n = Number(bondingCurve.n);
  const soldInUnits = Number(tokensSold) / 1_000_000;
  const currentSupply = soldInUnits;
  return k * Math.pow(currentSupply / 1_000_000_000, n);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get("wallet");

    if (!wallet) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 });
    }

    console.log(`[User Holdings] Fetching for wallet: ${wallet}`);
    const db = getDb();

    // Fetch all tokens (from "launches" collection)
    const tokensSnapshot = await db.collection("launches").get();
    const holdings: any[] = [];
    let totalValueUSD = 0;
    let totalCreatedTokensValueUSD = 0;

    console.log(`Found ${tokensSnapshot.docs.length} tokens in database`);

    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";
    const endpoint = network === "devnet"
      ? "https://solana-devnet.g.alchemy.com/v2/RVeMfinzUHGfNq_Alf3VR"
      : "https://solana-mainnet.g.alchemy.com/v2/RVeMfinzUHGfNq_Alf3VR";

    const connection = new Connection(endpoint, "confirmed");

    const publicKey = new PublicKey(wallet);

    // Get SOL price from CoinGecko
    let solPriceUSD = 100; // Fallback
    try {
      const priceRes = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
        { next: { revalidate: 60 } }
      );
      if (priceRes.ok) {
        const priceData = await priceRes.json();
        if (priceData.solana?.usd) {
          solPriceUSD = priceData.solana.usd;
          console.log(`Current SOL price: $${solPriceUSD}`);
        }
      }
    } catch (err) {
      console.error("Failed to fetch SOL price:", err);
    }

    // Check each token for user balance and calculate created tokens value
    for (const doc of tokensSnapshot.docs) {
      const tokenData = doc.data();
      console.log(`Checking token: ${tokenData.name} (${tokenData.mintAddress})`);

      // Calculate total value of tokens created by this user
      if (tokenData.creator === wallet) {
        const curveState = tokenData.curveState || {
          tokensRemaining: "800000000000000",
          tokensSold: "0",
          solCollected: "0",
        };

        const bondingCurve = tokenData.bondingCurve || {
          totalSupply: "800000000000000",
          k: 0.000000001,
          n: 1,
        };

        // Use SOL collected as the value (more reliable than market cap for tokens with missing data)
        const solCollected = Number(curveState.solCollected) / 1_000_000_000;
        const tokenValueUSD = solCollected * solPriceUSD;

        // If no SOL collected, try calculating with current price (for new tokens)
        if (solCollected === 0 && bondingCurve.k && bondingCurve.n) {
          const tokensSold = BigInt(curveState.tokensSold);
          const currentPrice = getCurrentPrice(bondingCurve, tokensSold);

          if (!isNaN(currentPrice) && currentPrice > 0) {
            const tokensSoldUnits = Number(tokensSold) / 1_000_000;
            const calculatedValue = (tokensSoldUnits * currentPrice * solPriceUSD) / 1000;
            if (!isNaN(calculatedValue)) {
              totalCreatedTokensValueUSD += calculatedValue;
              console.log(`  Created by user - Calculated Value: $${calculatedValue.toFixed(2)}`);
            }
          }
        } else {
          totalCreatedTokensValueUSD += tokenValueUSD;
          console.log(`  Created by user - SOL Collected Value: $${tokenValueUSD.toFixed(2)}`);
        }
      }

      try {
        const mintPubkey = new PublicKey(tokenData.mintAddress);
        const userATA = getAssociatedTokenAddressSync(
          mintPubkey,
          publicKey,
          false,
          TOKEN_PROGRAM_ID
        );

        const accountInfo = await connection.getAccountInfo(userATA);
        if (!accountInfo) {
          console.log(`  No token account found for ${tokenData.symbol}`);
          continue;
        }

        const tokenAccount = await getAccount(
          connection,
          userATA,
          "confirmed",
          TOKEN_PROGRAM_ID
        );

        const balance = Number(tokenAccount.amount) / 1_000_000;
        console.log(`  Found balance: ${balance} ${tokenData.symbol}`);

        if (balance <= 0) {
          console.log(`  Balance is zero, skipping`);
          continue;
        }

        // Calculate current price from bonding curve
        const curveState = tokenData.curveState || {
          tokensRemaining: "800000000000000",
          tokensSold: "0",
          solCollected: "0",
        };

        const bondingCurve = tokenData.bondingCurve || {
          totalSupply: "800000000000000",
          k: 0.000000001,
          n: 1,
        };

        // Calculate current token price
        let currentPrice = 0;
        const tokensSold = BigInt(curveState.tokensSold || "0");

        // Try to calculate price from bonding curve
        if (bondingCurve.k && bondingCurve.n && !isNaN(bondingCurve.k) && !isNaN(bondingCurve.n)) {
          currentPrice = getCurrentPrice(bondingCurve, tokensSold);

          // Check if result is valid
          if (isNaN(currentPrice) || !isFinite(currentPrice)) {
            currentPrice = 0;
          }
        }

        // If current price is invalid, use a fallback based on SOL collected / tokens sold
        if (!currentPrice || currentPrice === 0) {
          const solCollected = Number(curveState.solCollected || "0") / 1_000_000_000;
          const tokensSoldNum = Number(tokensSold) / 1_000_000;

          if (solCollected > 0 && tokensSoldNum > 0) {
            // Average price = total SOL collected in USD / total tokens sold
            currentPrice = (solCollected * solPriceUSD) / tokensSoldNum;
          } else if (solCollected > 0) {
            // If we have SOL collected but tokens sold is 0 or invalid, estimate
            currentPrice = 0.0001; // Small default price
          } else {
            // For brand new tokens or tokens with no trading data, use minimal price
            currentPrice = 0.00001; // Very small default price
          }
        }

        // Calculate current value: balance * current price
        let valueUSD = balance * currentPrice;

        // Get transaction history to calculate cost basis and change percentage
        const userTxSnapshot = await db
          .collection("transactions")
          .where("mintAddress", "==", tokenData.mintAddress)
          .where("user", "==", wallet)
          .get();

        let totalSpent = 0;
        let totalReceived = 0;
        let tokensBought = 0;
        let tokensSoldFromTx = 0;

        console.log(`  Found ${userTxSnapshot.docs.length} transactions for user`);

        userTxSnapshot.docs.forEach((txDoc) => {
          const tx = txDoc.data();
          const solAmount = Number(tx.solAmount) / 1_000_000_000;
          const usdAmount = solAmount * solPriceUSD;
          const tokensAmount = Number(tx.tokenAmount) / 1_000_000;

          console.log(`  Transaction: ${tx.type}, SOL: ${solAmount.toFixed(4)}, USD: $${usdAmount.toFixed(2)}, Tokens: ${tokensAmount.toFixed(2)}`);

          if (tx.type === "buy") {
            totalSpent += usdAmount;
            tokensBought += tokensAmount;
          } else if (tx.type === "sell") {
            totalReceived += usdAmount;
            tokensSoldFromTx += tokensAmount;
          }
        });

        console.log(`  Total spent: $${totalSpent.toFixed(2)}, Total received: $${totalReceived.toFixed(2)}, Cost basis: $${(totalSpent - totalReceived).toFixed(2)}`);

        // If still no valid value, use cost basis from transactions
        if (!valueUSD || isNaN(valueUSD) || valueUSD === 0) {
          valueUSD = totalSpent - totalReceived;
        }

        // Calculate change percentage
        let changePercent = 0;
        const costBasis = totalSpent - totalReceived;

        // Check if user is the creator of this token
        const isCreator = tokenData.creator === wallet;

        if (isCreator) {
          // Creator gets 1% of 1B total supply = 10M tokens
          const creatorAllocationTokens = 10_000_000;
          const creatorAllocationValue = creatorAllocationTokens * currentPrice;

          console.log(`  Creator allocation: ${creatorAllocationTokens} tokens worth $${creatorAllocationValue.toFixed(2)}`);

          if (costBasis > 0 && valueUSD > 0) {
            // Creator with purchases
            // Calculate P&L on purchased tokens separately
            const purchasedValue = valueUSD - creatorAllocationValue;
            const purchasedGainLoss = purchasedValue - costBasis;

            // Total gain/loss includes free creator tokens (which are pure gain)
            const totalGainLoss = creatorAllocationValue + purchasedGainLoss;

            // Show change % relative to what was actually spent
            changePercent = (totalGainLoss / costBasis) * 100;

            console.log(`  Creator P&L: Total gain/loss $${totalGainLoss.toFixed(2)}, Change: ${changePercent.toFixed(2)}%`);
          } else if (creatorAllocationValue > 0) {
            // Creator with no purchases or sold everything
            // All remaining value is from free creator allocation - show as neutral gain
            changePercent = valueUSD > 0 ? 50 : 0; // Show moderate positive for free tokens
          }
        } else if (costBasis > 0 && valueUSD > 0) {
          // Regular user with purchases - calculate P&L
          changePercent = ((valueUSD - costBasis) / costBasis) * 100;
        } else if (tokensBought > 0 && valueUSD > 0) {
          // Has purchases but cost basis is 0 or negative (sold more than bought)
          const avgBuyPrice = totalSpent / tokensBought;
          const originalValue = balance * avgBuyPrice;
          if (originalValue > 0) {
            changePercent = ((valueUSD - originalValue) / originalValue) * 100;
          }
        }
        // For tokens with no transactions and not creator, leave changePercent at 0

        // Only add to total if value is valid
        if (valueUSD && !isNaN(valueUSD) && valueUSD > 0) {
          totalValueUSD += valueUSD;
        } else {
          valueUSD = 0; // Set to 0 if invalid
        }

        console.log(`  Adding to holdings: ${tokenData.symbol} - Value: $${valueUSD.toFixed(2)} (Price: $${currentPrice})`);

        // Calculate unrealized gain/loss
        const gainLoss = costBasis > 0 ? valueUSD - costBasis : 0;

        holdings.push({
          mintAddress: tokenData.mintAddress,
          name: tokenData.name,
          symbol: tokenData.symbol,
          imageUrl: tokenData.imageUrl || null,
          balance,
          valueUSD,
          changePercent,
          currentPrice,
          createdAt: tokenData.createdAt || null,
          costBasis: costBasis > 0 ? costBasis : 0,
          gainLoss,
        });
      } catch (err) {
        console.error(`Error checking token ${tokenData.mintAddress}:`, err);
      }
    }

    // Sort by creation date descending (newest first)
    holdings.sort((a, b) => {
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Calculate total change percent (weighted average)
    const totalChangePercent = holdings.length > 0 && totalValueUSD > 0
      ? holdings.reduce((sum, h) => sum + (h.changePercent * h.valueUSD), 0) / totalValueUSD
      : 0;

    console.log(`Returning ${holdings.length} holdings, total value: $${totalValueUSD.toFixed(2)}`);
    console.log(`Total created tokens value: $${totalCreatedTokensValueUSD.toFixed(2)}`);

    return NextResponse.json({
      holdings,
      totalValueUSD,
      totalChangePercent,
      totalCreatedTokensValueUSD,
    });
  } catch (error: any) {
    console.error("Error fetching user holdings:", error);
    return NextResponse.json(
      { error: "Failed to fetch holdings", details: error.message },
      { status: 500 }
    );
  }
}
