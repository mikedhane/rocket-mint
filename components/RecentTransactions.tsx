"use client";

import { useEffect, useState } from "react";

type Transaction = {
  type: "buy" | "sell";
  user: string;
  tokenAmount: string;
  solAmount: string;
  timestamp: string;
};

export default function RecentTransactions({ mintAddress, solPriceUSD }: { mintAddress: string; solPriceUSD: number }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!mintAddress) return;

    const fetchTransactions = async () => {
      try {
        const res = await fetch(`/api/transactions?mintAddress=${mintAddress}&limit=7`);
        const data = await res.json();
        if (data.transactions) {
          setTransactions(data.transactions.slice(-7).reverse()); // Get last 7 and reverse to show newest first
        }
      } catch (err) {
        console.error("Error fetching transactions:", err);
      }
    };

    // Fetch immediately
    fetchTransactions();

    // Refresh every 3 seconds
    const interval = setInterval(fetchTransactions, 5000);
    return () => clearInterval(interval);
  }, [mintAddress]);

  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h3 className="text-lg font-bold mb-4">Recent Transactions</h3>
        <p className="text-zinc-500 text-sm text-center py-8">No transactions yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
      <h3 className="text-lg font-bold mb-4">Recent Transactions</h3>
      <div className="relative">
        <div className="space-y-2">
          {transactions.map((tx, index) => {
          const isBuy = tx.type === "buy";
          const solAmount = Number(tx.solAmount) / 1_000_000_000;
          const tokenAmount = Number(tx.tokenAmount) / 1_000_000;
          const usdValue = solAmount * solPriceUSD;
          const shortAddress = `${tx.user.slice(0, 4)}...${tx.user.slice(-4)}`;

          return (
            <div
              key={`${tx.user}-${tx.timestamp}-${index}`}
              className={`
                rounded-lg border p-3
                ${
                  isBuy
                    ? "bg-emerald-950/30 border-emerald-500/30"
                    : "bg-red-950/30 border-red-500/30"
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center
                      ${isBuy ? "bg-emerald-500" : "bg-red-500"}
                    `}
                  >
                    {isBuy ? (
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-bold ${
                          isBuy ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {isBuy ? "BUY" : "SELL"}
                      </span>
                      <span className="text-xs text-zinc-400">{shortAddress}</span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {tokenAmount.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}{" "}
                      tokens
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-semibold">
                    ${usdValue.toFixed(2)}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {solAmount.toFixed(4)} SOL
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        </div>
        {/* Fade out gradient at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none" style={{
          background: "linear-gradient(to bottom, transparent, rgb(9, 9, 11))"
        }} />
      </div>
    </div>
  );
}
