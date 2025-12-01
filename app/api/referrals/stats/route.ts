import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get("wallet");

    if (!wallet) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 });
    }

    const db = getDb();

    // Get user's referral data
    const userRef = db.collection("referrals").doc(wallet);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // Create new user document
      await userRef.set({
        wallet,
        referrer: null,
        level1: [],
        level2: [],
        level3: [],
        totalEarned: 0,
        level1Earnings: 0,
        level2Earnings: 0,
        level3Earnings: 0,
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({
        totalEarned: 0,
        level1Count: 0,
        level2Count: 0,
        level3Count: 0,
        level1Earnings: 0,
        level2Earnings: 0,
        level3Earnings: 0,
      });
    }

    const data = userDoc.data();

    return NextResponse.json({
      totalEarned: data.totalEarned || 0,
      level1Count: data.level1?.length || 0,
      level2Count: data.level2?.length || 0,
      level3Count: data.level3?.length || 0,
      level1Earnings: data.level1Earnings || 0,
      level2Earnings: data.level2Earnings || 0,
      level3Earnings: data.level3Earnings || 0,
    });
  } catch (error) {
    console.error("Error fetching referral stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch referral stats" },
      { status: 500 }
    );
  }
}
