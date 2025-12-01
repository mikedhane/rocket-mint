import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  try {
    const { wallet, referrerCode } = await request.json();

    if (!wallet) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 });
    }

    const db = getDb();

    // Check if user already has a referrer
    const userRef = db.collection("referrals").doc(wallet);
    const userDoc = await userRef.get();

    if (userDoc.exists && userDoc.data()?.referrer) {
      return NextResponse.json({
        message: "User already registered with a referrer"
      }, { status: 200 });
    }

    if (!referrerCode) {
      // Create user without referrer
      await userRef.set({
        wallet,
        referrer: null,
        level1: [],
        level2: [],
        level3: [],
        totalEarned: 0,
        createdAt: new Date().toISOString(),
      }, { merge: true });

      return NextResponse.json({ success: true });
    }

    // Find referrer by code
    const referrersSnapshot = await db.collection("referrals")
      .where("wallet", ">=", referrerCode)
      .where("wallet", "<=", referrerCode + "\uf8ff")
      .limit(1)
      .get();

    if (referrersSnapshot.empty) {
      // No referrer found, create user without referrer
      await userRef.set({
        wallet,
        referrer: null,
        level1: [],
        level2: [],
        level3: [],
        totalEarned: 0,
        createdAt: new Date().toISOString(),
      }, { merge: true });

      return NextResponse.json({ success: true });
    }

    const referrerWallet = referrersSnapshot.docs[0].data().wallet;

    // Don't allow self-referral
    if (referrerWallet === wallet) {
      return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 });
    }

    // Create user with referrer
    await userRef.set({
      wallet,
      referrer: referrerWallet,
      level1: [],
      level2: [],
      level3: [],
      totalEarned: 0,
      createdAt: new Date().toISOString(),
    }, { merge: true });

    // Update referrer's level1
    const referrerRef = db.collection("referrals").doc(referrerWallet);
    await referrerRef.update({
      level1: FieldValue.arrayUnion(wallet),
    });

    // Get referrer's referrer for level2
    const referrerDoc = await referrerRef.get();
    const referrerData = referrerDoc.data();

    if (referrerData?.referrer) {
      const level2Ref = db.collection("referrals").doc(referrerData.referrer);
      await level2Ref.update({
        level2: FieldValue.arrayUnion(wallet),
      });

      // Get level2's referrer for level3
      const level2Doc = await level2Ref.get();
      const level2Data = level2Doc.data();

      if (level2Data?.referrer) {
        const level3Ref = db.collection("referrals").doc(level2Data.referrer);
        await level3Ref.update({
          level3: FieldValue.arrayUnion(wallet),
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error registering referral:", error);
    return NextResponse.json(
      { error: "Failed to register referral" },
      { status: 500 }
    );
  }
}
