// app/api/tokens/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import type { Query, DocumentData } from "firebase-admin/firestore";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all"; // all, active, graduated
    const sortBy = searchParams.get("sort") || "recent"; // recent, volume, progress
    const limit = parseInt(searchParams.get("limit") || "50");

    const db = getDb();
    let query: Query<DocumentData> = db.collection("launches");

    // Apply limit without sorting to avoid index requirements
    query = query.limit(limit * 3); // Get more docs to sort in memory

    const snapshot = await query.get();

    if (snapshot.empty) {
      return NextResponse.json({ tokens: [] });
    }

    let tokens = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        mintAddress: data.mintAddress,
        name: data.name,
        symbol: data.symbol,
        description: data.description || "",
        imageUrl: data.imageUrl || null,
        network: data.network || "devnet",
        creator: data.creator || "",
        curveReserveWallet: data.curveReserveWallet || "",
        graduated: data.graduated || false,
        graduatedAt: data.graduatedAt || null,
        createdAt: data.createdAt || null,
        bondingCurve: data.bondingCurve || {
          totalSupply: "800000000000000",
          initialPrice: 0.000000001,
          finalPrice: 0.001,
          platformFeeBps: 100,
          creatorFeeBps: 100,
        },
        curveState: data.curveState || {
          tokensRemaining: "800000000000000",
          tokensSold: "0",
          solCollected: "0",
        },
      };
    });

    // Apply filters in memory
    if (filter === "graduated") {
      tokens = tokens.filter((t) => t.graduated === true);
    } else if (filter === "active") {
      tokens = tokens.filter((t) => t.graduated !== true);
    }

    // Apply sorting in memory
    if (sortBy === "volume") {
      tokens.sort((a, b) => {
        const aVol = BigInt(a.curveState.solCollected);
        const bVol = BigInt(b.curveState.solCollected);
        return aVol > bVol ? -1 : aVol < bVol ? 1 : 0;
      });
    } else if (sortBy === "recent") {
      tokens.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
    }

    // Apply limit after filtering and sorting
    tokens = tokens.slice(0, limit);

    return NextResponse.json({ tokens });
  } catch (error: any) {
    console.error("Error fetching tokens:", error);
    return NextResponse.json(
      { error: "Failed to fetch tokens" },
      { status: 500 }
    );
  }
}
