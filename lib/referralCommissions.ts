import { db } from "@/lib/firebaseAdmin";

interface CommissionResult {
  level1: number;
  level2: number;
  level3: number;
  total: number;
}

/**
 * Calculate and distribute referral commissions for a transaction
 * @param userWallet - The wallet address of the user who made the transaction
 * @param transactionFeesUSD - The total trading fees in USD from this transaction
 * @returns Commission amounts distributed to each level
 */
export async function distributeReferralCommissions(
  userWallet: string,
  transactionFeesUSD: number
): Promise<CommissionResult> {
  const result: CommissionResult = {
    level1: 0,
    level2: 0,
    level3: 0,
    total: 0,
  };

  try {
    // Get user's referral data
    const userRef = db.collection("referrals").doc(userWallet);
    const userDoc = await userRef.get();

    if (!userDoc.exists || !userDoc.data()?.referrer) {
      // User has no referrer, no commissions to distribute
      return result;
    }

    const userData = userDoc.data();
    const level1Wallet = userData?.referrer;

    // Level 1: Direct referrer gets 35%
    if (level1Wallet) {
      const level1Commission = transactionFeesUSD * 0.35;
      result.level1 = level1Commission;

      const level1Ref = db.collection("referrals").doc(level1Wallet);
      await level1Ref.update({
        totalEarned: db.FieldValue.increment(level1Commission),
        level1Earnings: db.FieldValue.increment(level1Commission),
      });

      // Get level 1's referrer for level 2
      const level1Doc = await level1Ref.get();
      const level1Data = level1Doc.data();
      const level2Wallet = level1Data?.referrer;

      // Level 2: Referrer's referrer gets 20%
      if (level2Wallet) {
        const level2Commission = transactionFeesUSD * 0.20;
        result.level2 = level2Commission;

        const level2Ref = db.collection("referrals").doc(level2Wallet);
        await level2Ref.update({
          totalEarned: db.FieldValue.increment(level2Commission),
          level2Earnings: db.FieldValue.increment(level2Commission),
        });

        // Get level 2's referrer for level 3
        const level2Doc = await level2Ref.get();
        const level2Data = level2Doc.data();
        const level3Wallet = level2Data?.referrer;

        // Level 3: Referrer's referrer's referrer gets 5%
        if (level3Wallet) {
          const level3Commission = transactionFeesUSD * 0.05;
          result.level3 = level3Commission;

          const level3Ref = db.collection("referrals").doc(level3Wallet);
          await level3Ref.update({
            totalEarned: db.FieldValue.increment(level3Commission),
            level3Earnings: db.FieldValue.increment(level3Commission),
          });
        }
      }
    }

    result.total = result.level1 + result.level2 + result.level3;

    console.log(`Distributed $${result.total.toFixed(2)} in referral commissions for ${userWallet}:`, {
      level1: `$${result.level1.toFixed(2)}`,
      level2: `$${result.level2.toFixed(2)}`,
      level3: `$${result.level3.toFixed(2)}`,
    });

    return result;
  } catch (error) {
    console.error("Error distributing referral commissions:", error);
    return result;
  }
}

/**
 * Calculate total trading fees in USD from a transaction
 * @param platformFeeLamports - Platform fee in lamports
 * @param creatorFeeLamports - Creator fee in lamports
 * @param solPriceUSD - Current SOL price in USD
 * @returns Total fees in USD
 */
export function calculateTradingFeesUSD(
  platformFeeLamports: bigint,
  creatorFeeLamports: bigint,
  solPriceUSD: number
): number {
  const LAMPORTS_PER_SOL = 1_000_000_000;
  const totalFeesLamports = platformFeeLamports + creatorFeeLamports;
  const totalFeesSOL = Number(totalFeesLamports) / LAMPORTS_PER_SOL;
  const totalFeesUSD = totalFeesSOL * solPriceUSD;
  return totalFeesUSD;
}
