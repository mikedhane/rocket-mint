"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Copy, Share2, Users, DollarSign, Gift } from "lucide-react";
import BottomNav from "@/components/BottomNav";

export default function ReferralsPage() {
  const { publicKey } = useWallet();
  const [referralStats, setReferralStats] = useState({
    totalEarned: 0,
    level1Count: 0,
    level2Count: 0,
    level3Count: 0,
    level1Earnings: 0,
    level2Earnings: 0,
    level3Earnings: 0,
  });
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showBar1, setShowBar1] = useState(false);
  const [showBar2, setShowBar2] = useState(false);
  const [showBar3, setShowBar3] = useState(false);

  // Load avatar from localStorage
  useEffect(() => {
    if (publicKey) {
      const savedAvatar = localStorage.getItem(`avatar_${publicKey.toBase58()}`);
      if (savedAvatar) {
        setAvatarUrl(savedAvatar);
      }
    }
  }, [publicKey]);

  useEffect(() => {
    if (publicKey) {
      // Generate referral code from wallet address
      const code = publicKey.toBase58().substring(0, 8);
      setReferralCode(code);

      // Fetch referral stats
      fetchReferralStats();
    }
  }, [publicKey]);

  // Animate bars sequentially on mount
  useEffect(() => {
    const timer1 = setTimeout(() => setShowBar1(true), 200);
    const timer2 = setTimeout(() => setShowBar2(true), 500);
    const timer3 = setTimeout(() => setShowBar3(true), 800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const fetchReferralStats = async () => {
    if (!publicKey) return;

    try {
      const response = await fetch(`/api/referrals/stats?wallet=${publicKey.toBase58()}`);
      if (response.ok) {
        const data = await response.json();
        setReferralStats(data);
      }
    } catch (error) {
      console.error("Error fetching referral stats:", error);
    }
  };

  const getReferralLink = () => {
    if (!publicKey) return "";
    return `${window.location.origin}?ref=${referralCode}`;
  };

  const copyReferralLink = () => {
    const link = getReferralLink();
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferralLink = async () => {
    const link = getReferralLink();
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Rocket-Mint",
          text: "Join me on Rocket-Mint and let's earn together!",
          url: link,
        });
      } catch (err) {
        console.log("Share failed:", err);
      }
    } else {
      copyReferralLink();
    }
  };

  if (!publicKey) {
    return (
      <>
        <main className="min-h-screen bg-linear-to-b from-black to-zinc-900 text-white px-4 py-8 pb-24">
          <div className="max-w-md mx-auto text-center mt-20">
            <Gift className="w-20 h-20 mx-auto mb-4 text-violet-500" />
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-zinc-400">Connect your wallet to access the referral program</p>
          </div>
        </main>
        <BottomNav />
      </>
    );
  }

  const totalEarnings = referralStats.level1Earnings + referralStats.level2Earnings + referralStats.level3Earnings;

  return (
    <>
      <main className="min-h-screen bg-linear-to-b from-black to-zinc-900 text-white px-4 py-8 pb-24">
        <div className="max-w-md mx-auto">
          {/* Lifetime Rewards Card */}
          <div className="mb-8 flex items-center justify-center">
            <div className="flex items-center gap-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl px-6 py-4">
              <div className="relative">
                <div className="w-16 h-16 bg-linear-to-br from-violet-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-violet-500/50 overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <DollarSign className="w-8 h-8 text-white" />
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-zinc-400">Lifetime rewards</p>
                <p className="text-3xl font-bold">${totalEarnings.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">
              Get cash whenever your friends and their friends trade
            </h1>
            <p className="text-zinc-400 text-sm">
              Earn up to <span className="text-violet-400 font-semibold">60%</span> of trading fees from your referrals
            </p>
          </div>

          {/* Commission Structure Visualization */}
          <div className="mb-8">
            <div className="flex items-end justify-center gap-4 mb-6">
              <div className="flex flex-col items-center">
                <div className="text-violet-400 font-bold text-lg mb-2">35%</div>
                <div
                  className="w-16 bg-linear-to-t from-violet-600 to-violet-500 rounded-lg transition-all duration-700 ease-out"
                  style={{ height: showBar1 ? '128px' : '0px' }}
                ></div>
              </div>
              <div className="text-zinc-500 text-2xl pb-12">+</div>
              <div className="flex flex-col items-center">
                <div className="text-violet-400 font-bold text-lg mb-2">20%</div>
                <div
                  className="w-16 bg-linear-to-t from-violet-600 to-violet-500 rounded-lg transition-all duration-700 ease-out"
                  style={{ height: showBar2 ? '96px' : '0px' }}
                ></div>
              </div>
              <div className="text-zinc-500 text-2xl pb-8">+</div>
              <div className="flex flex-col items-center">
                <div className="text-violet-400 font-bold text-lg mb-2">5%</div>
                <div
                  className="w-16 bg-linear-to-t from-violet-600 to-violet-500 rounded-lg transition-all duration-700 ease-out"
                  style={{ height: showBar3 ? '64px' : '0px' }}
                ></div>
              </div>
            </div>

            {/* Referral Levels */}
            <div className="flex items-center justify-center gap-2 text-sm">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-2 border-2 border-violet-500 overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="You" className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-6 h-6 text-violet-500" />
                  )}
                </div>
                <span className="text-zinc-400">You</span>
              </div>

              <div className="text-zinc-600">›</div>

              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-2">
                  <span className="text-lg font-bold text-white">{referralStats.level1Count}</span>
                </div>
                <span className="text-zinc-400 text-xs">Direct</span>
              </div>

              <div className="text-zinc-600">›</div>

              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-2">
                  <span className="text-lg font-bold text-white">{referralStats.level2Count}</span>
                </div>
                <span className="text-zinc-400 text-xs">2nd°</span>
              </div>

              <div className="text-zinc-600">›</div>

              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-2">
                  <span className="text-lg font-bold text-white">{referralStats.level3Count}</span>
                </div>
                <span className="text-zinc-400 text-xs">3rd°</span>
              </div>
            </div>
          </div>

          {/* Earnings Breakdown */}
          {totalEarnings > 0 && (
            <div className="mb-8 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3 text-zinc-300">Earnings Breakdown</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Level 1 (35%)</span>
                  <span className="text-white font-medium">${referralStats.level1Earnings.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Level 2 (20%)</span>
                  <span className="text-white font-medium">${referralStats.level2Earnings.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Level 3 (5%)</span>
                  <span className="text-white font-medium">${referralStats.level3Earnings.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Referral Link */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-300 mb-2">Your Referral Link</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={getReferralLink()}
                readOnly
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white"
              />
              <button
                onClick={copyReferralLink}
                className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition"
              >
                <Copy className={`w-5 h-5 ${copied ? "text-green-500" : "text-white"}`} />
              </button>
            </div>
            {copied && (
              <p className="text-sm text-green-500 mt-2">Copied to clipboard!</p>
            )}
          </div>

          {/* Invite Button */}
          <button
            onClick={shareReferralLink}
            className="w-full bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold py-4 rounded-xl transition flex items-center justify-center gap-2"
          >
            <Share2 className="w-5 h-5" />
            Invite Friends
          </button>

          {/* Info Text */}
          <p className="text-xs text-zinc-500 text-center mt-4">
            Rewards distributed automatically on every trade. No purchase necessary.
          </p>
        </div>
      </main>
      <BottomNav />
    </>
  );
}
