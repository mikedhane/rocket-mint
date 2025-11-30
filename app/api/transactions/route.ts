// app/api/transactions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";

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

    if (snapshot.empty) {
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
