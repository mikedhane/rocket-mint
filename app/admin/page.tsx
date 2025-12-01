"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";

type AdminStats = {
  totalTokens: number;
  graduatedTokens: number;
  activeTokens: number;
  totalSolCollected: string;
  totalPlatformFees: string;
  totalCreatorFees: string;
  totalTokensSold: string;
  totalSolCollectedFormatted: string;
  totalPlatformFeesFormatted: string;
  totalCreatorFeesFormatted: string;
  solPriceUSD: number;
  totalSolVolumeUSD: number;
  totalPlatformFeesUSD: number;
  totalCreatorFeesUSD: number;
  recentLaunches: Array<{
    name: string;
    symbol: string;
    mintAddress: string;
    createdAt: string;
    solCollected: string;
    graduated: boolean;
  }>;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedWallet, setCopiedWallet] = useState(false);

  const platformTreasury = process.env.NEXT_PUBLIC_PLATFORM_TREASURY || "Not configured";

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Get JWT token from localStorage
      const token = localStorage.getItem("admin_token");

      if (!token) {
        router.push("/admin/login");
        return;
      }

      const res = await fetch("/api/admin/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        // Token is invalid or expired, redirect to login
        localStorage.removeItem("admin_token");
        router.push("/admin/login");
        return;
      }

      if (!res.ok) throw new Error("Failed to fetch stats");

      const data = await res.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message || "Failed to load statistics");
    } finally {
      setLoading(false);
    }
  };

  const copyWalletAddress = async () => {
    try {
      await navigator.clipboard.writeText(platformTreasury);
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-zinc-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mb-4"></div>
          <p className="text-zinc-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-zinc-900 text-white flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => fetchStats()}
            className="px-6 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg font-medium transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-zinc-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-zinc-400">Platform statistics and metrics</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                localStorage.removeItem("admin_token");
                router.push("/admin/login");
              }}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition"
            >
              Logout
            </button>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition"
            >
              Back to Home
            </button>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Platform Fees Collected */}
          <div className="rounded-2xl border border-emerald-800 bg-emerald-950/30 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-600/20 flex items-center justify-center text-emerald-400">
                💰
              </div>
              <h3 className="text-sm font-medium text-zinc-400">Platform Fees</h3>
            </div>
            <p className="text-3xl font-bold text-emerald-400">
              ${stats.totalPlatformFeesUSD.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="text-sm text-zinc-500 mt-1">{stats.totalPlatformFeesFormatted} SOL</p>
            <p className="text-xs text-zinc-600 mt-1">1% of trading volume</p>
          </div>

          {/* Creator Fees */}
          <div className="rounded-2xl border border-violet-800 bg-violet-950/30 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-violet-600/20 flex items-center justify-center text-violet-400">
                👥
              </div>
              <h3 className="text-sm font-medium text-zinc-400">Creator Fees</h3>
            </div>
            <p className="text-3xl font-bold text-violet-400">
              ${stats.totalCreatorFeesUSD.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="text-sm text-zinc-500 mt-1">{stats.totalCreatorFeesFormatted} SOL</p>
            <p className="text-xs text-zinc-600 mt-1">1% to token creators</p>
          </div>

          {/* Total Volume */}
          <div className="rounded-2xl border border-blue-800 bg-blue-950/30 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400">
                📊
              </div>
              <h3 className="text-sm font-medium text-zinc-400">Total Volume</h3>
            </div>
            <p className="text-3xl font-bold text-blue-400">
              ${stats.totalSolVolumeUSD.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="text-sm text-zinc-500 mt-1">{stats.totalSolCollectedFormatted} SOL</p>
            <p className="text-xs text-zinc-600 mt-1">All-time trading volume</p>
          </div>

          {/* Total Tokens */}
          <div className="rounded-2xl border border-orange-800 bg-orange-950/30 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-orange-600/20 flex items-center justify-center text-orange-400">
                🎯
              </div>
              <h3 className="text-sm font-medium text-zinc-400">Total Tokens</h3>
            </div>
            <p className="text-3xl font-bold text-orange-400">{stats.totalTokens}</p>
            <p className="text-xs text-zinc-500 mt-1">
              {stats.graduatedTokens} graduated • {stats.activeTokens} active
            </p>
          </div>
        </div>

        {/* Platform Treasury Wallet */}
        <div className="mb-8">
          <div className="rounded-2xl border border-emerald-800 bg-emerald-950/20 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-lg bg-emerald-600/20 flex items-center justify-center text-emerald-400 text-xl">
                    🏦
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Platform Treasury Wallet</h2>
                    <p className="text-sm text-zinc-400">All platform fees (1%) are deposited here</p>
                  </div>
                </div>
                <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                  <p className="text-xs text-zinc-500 mb-1">Solana Address</p>
                  <div className="flex items-center gap-3">
                    <code className="text-emerald-400 font-mono text-sm break-all flex-1">
                      {platformTreasury}
                    </code>
                    <button
                      onClick={copyWalletAddress}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition flex-shrink-0"
                    >
                      {copiedWallet ? "✓ Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex gap-3">
                  <a
                    href={`https://explorer.solana.com/address/${platformTreasury}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-emerald-400 hover:text-emerald-300 transition"
                  >
                    View on Devnet Explorer →
                  </a>
                  <a
                    href={`https://explorer.solana.com/address/${platformTreasury}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-emerald-400 hover:text-emerald-300 transition"
                  >
                    View on Mainnet Explorer →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Token Statistics */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-xl font-bold mb-4">Token Statistics</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
                <span className="text-zinc-400">Total Tokens Launched</span>
                <span className="text-xl font-bold">{stats.totalTokens}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
                <span className="text-zinc-400">Graduated Tokens</span>
                <span className="text-xl font-bold text-yellow-400">
                  {stats.graduatedTokens}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
                <span className="text-zinc-400">Active Tokens</span>
                <span className="text-xl font-bold text-green-400">
                  {stats.activeTokens}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Graduation Rate</span>
                <span className="text-xl font-bold">
                  {stats.totalTokens > 0
                    ? ((stats.graduatedTokens / stats.totalTokens) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>

          {/* Financial Overview */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-xl font-bold mb-4">Financial Overview</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
                <span className="text-zinc-400">Total SOL Volume</span>
                <div className="text-right">
                  <div className="text-xl font-bold">
                    ${stats.totalSolVolumeUSD.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div className="text-sm text-zinc-500">{stats.totalSolCollectedFormatted} SOL</div>
                </div>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
                <span className="text-zinc-400">Platform Revenue</span>
                <div className="text-right">
                  <div className="text-xl font-bold text-emerald-400">
                    ${stats.totalPlatformFeesUSD.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div className="text-sm text-zinc-500">{stats.totalPlatformFeesFormatted} SOL</div>
                </div>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
                <span className="text-zinc-400">Creator Earnings</span>
                <div className="text-right">
                  <div className="text-xl font-bold text-violet-400">
                    ${stats.totalCreatorFeesUSD.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div className="text-sm text-zinc-500">{stats.totalCreatorFeesFormatted} SOL</div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Total Fees Collected</span>
                <div className="text-right">
                  <div className="text-xl font-bold">
                    ${(stats.totalPlatformFeesUSD + stats.totalCreatorFeesUSD).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div className="text-sm text-zinc-500">
                    {(parseFloat(stats.totalPlatformFeesFormatted) + parseFloat(stats.totalCreatorFeesFormatted)).toFixed(4)} SOL
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Launches */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
          <h2 className="text-xl font-bold mb-4">Recent Launches</h2>
          {stats.recentLaunches && stats.recentLaunches.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Token</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Symbol</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Status</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-zinc-400">Volume</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-zinc-400">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentLaunches.map((launch, idx) => (
                    <tr key={idx} className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition">
                      <td className="py-3 px-4">
                        <div className="font-medium">{launch.name}</div>
                        <div className="text-xs text-zinc-500 truncate max-w-[200px]">
                          {launch.mintAddress}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-zinc-300">{launch.symbol}</td>
                      <td className="py-3 px-4">
                        {launch.graduated ? (
                          <span className="px-2 py-1 text-xs font-semibold bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full">
                            🎓 Graduated
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold bg-green-600 text-white rounded-full">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-400">
                        {(Number(launch.solCollected) / 1e9).toFixed(4)} SOL
                      </td>
                      <td className="py-3 px-4 text-right text-zinc-400 text-sm">
                        {launch.createdAt
                          ? new Date(launch.createdAt).toLocaleDateString()
                          : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-zinc-400 text-center py-8">No recent launches</p>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
