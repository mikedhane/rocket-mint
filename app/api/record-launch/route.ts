// app/api/record-launch/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { encryptPrivateKey } from "@/lib/kmsEncryption";

// Optional: handy to verify the route exists in your browser
export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/record-launch",
    message: "Record launch endpoint is alive.",
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      mintAddress,
      name,
      symbol,
      description,
      imageUrl,
      metadataUrl,
      network,
      platformFeeBps,
      creatorFeeBps,
      mintSignature,
      metadataSignature,
      creatorTreasury,
      creator,
      curveReserveWallet,
      reservePrivateKey,
      bondingCurve,
      curveState,
      website,
      twitter,
    } = body;

    if (!mintAddress || !name || !symbol) {
      return NextResponse.json(
        { error: "mintAddress, name, and symbol are required" },
        { status: 400 }
      );
    }

    // Encrypt the reserve private key using Google Cloud KMS
    let encryptedPrivateKey = null;
    if (reservePrivateKey) {
      try {
        encryptedPrivateKey = await encryptPrivateKey(reservePrivateKey);
        console.log("[KMS] Successfully encrypted reserve private key for token:", mintAddress);
      } catch (error: any) {
        console.error("[KMS] Failed to encrypt private key:", error.message);
        return NextResponse.json(
          { error: `Failed to encrypt private key: ${error.message}` },
          { status: 500 }
        );
      }
    }

    const doc = {
      mintAddress,
      name,
      symbol,
      description: description || "",
      imageUrl: imageUrl || null,
      metadataUrl: metadataUrl || null,
      network: network || "devnet",
      platformFeeBps: platformFeeBps ?? null,
      creatorFeeBps: creatorFeeBps ?? null,
      mintSignature: mintSignature || null,
      metadataSignature: metadataSignature || null,
      creatorTreasury: creatorTreasury || null,
      creator: creator || null,
      // Social links
      website: website || null,
      twitter: twitter || null,
      // Bonding curve data
      curveReserveWallet: curveReserveWallet || null,
      reservePrivateKey: encryptedPrivateKey, // Now encrypted with Google Cloud KMS!
      encryptionMethod: encryptedPrivateKey ? "gcp-kms" : null,
      encryptionKeyVersion: encryptedPrivateKey ? 1 : null,
      bondingCurve: bondingCurve || null,
      curveState: curveState || null,
      createdAt: new Date().toISOString(),
    };

    const db = getDb();
    await db.collection("launches").add(doc);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("record-launch error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Failed to record launch" },
      { status: 500 }
    );
  }
}
