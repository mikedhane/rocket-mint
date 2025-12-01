// app/api/transactions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { distributeReferralCommissions, calculateTradingFeesUSD } from "@/lib/referralCommissions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mintAddress = searchParams.get("mintAddress");
    const userAddress = searchParams.get("user");
    const limit = parseInt(searchParams.get("limit") || "100");

    if (!mintAddress) {
      return NextResponse.json(
        { error: "mintAddress is required" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Fetch transactions for this token
    let query = db
      .collection("transactions")
      .where("mintAddress", "==", mintAddress);

    // Optionally filter by user address
    if (userAddress) {
      query = query.where("user", "==", userAddress);
    }

    const snapshot = await query.get();

    console.log(`🔍 Fetching transactions for mintAddress: ${mintAddress}`);
    console.log(`📊 Found ${snapshot.size} transactions`);

    if (snapshot.empty) {
      console.log(`⚠️ No transactions found for ${mintAddress}`);
      return NextResponse.json({ transactions: [] });
    }

    // Sort by timestamp in memory
    const transactions = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a: any, b: any) => {
        const aTime = new Date(a.timestamp).getTime();
        const bTime = new Date(b.timestamp).getTime();
        return aTime - bTime;
      })
      .slice(0, limit);

    return NextResponse.json({ transactions });
  } catch (error: any) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions", transactions: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      mintAddress,
      user,
      type,
      amount,
      signature,
      platformFee,
      creatorFee,
      solPrice
    } = body;

    if (!mintAddress || !user || !type || !amount || !signature) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Record the transaction
    const transactionData = {
      mintAddress,
      user,
      type, // "buy" or "sell"
      amount: parseFloat(amount),
      signature,
      platformFee: platformFee || 0,
      creatorFee: creatorFee || 0,
      timestamp: new Date().toISOString(),
    };

    await db.collection("transactions").add(transactionData);

    // Distribute referral commissions if fees are provided
    if (platformFee && creatorFee && solPrice) {
      const platformFeeLamports = BigInt(Math.floor(platformFee));
      const creatorFeeLamports = BigInt(Math.floor(creatorFee));

      const totalFeesUSD = calculateTradingFeesUSD(
        platformFeeLamports,
        creatorFeeLamports,
        solPrice
      );

      // Distribute commissions to referrers
      await distributeReferralCommissions(user, totalFeesUSD);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error recording transaction:", error);
    return NextResponse.json(
      { error: "Failed to record transaction" },
      { status: 500 }
    );
  }
}
