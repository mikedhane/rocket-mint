"use client";

import { useEffect, useState } from "react";

type Transaction = {
  type: "buy" | "sell";
  user: string;
  tokenAmount: string;
  solAmount: string;
  timestamp: string;
};

type ToastNotification = Transaction & {
  id: string;
  isExiting: boolean;
};

export default function TransactionToast({ mintAddress, solPriceUSD }: { mintAddress: string; solPriceUSD: number }) {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  // Start from 10 seconds ago to catch recent transactions on page load
  const [lastTimestamp, setLastTimestamp] = useState<string>(new Date(Date.now() - 10000).toISOString());

  useEffect(() => {
    if (!mintAddress) return;

    const checkForNewTransactions = async () => {
      try {
        const res = await fetch(`/api/transactions?mintAddress=${mintAddress}&limit=5`);
        const data = await res.json();

        console.log('[Toast] Checking for transactions...', {
          totalTransactions: data.transactions?.length || 0,
          lastTimestamp,
        });

        if (data.transactions && data.transactions.length > 0) {
          // Find transactions newer than our last check
          const newTransactions = data.transactions.filter(
            (tx: Transaction) => tx.timestamp > lastTimestamp
          );

          console.log('[Toast] New transactions found:', newTransactions.length);

          if (newTransactions.length > 0) {
            // Add new transactions as toasts
            const newToasts = newTransactions.map((tx: Transaction) => ({
              ...tx,
              id: `${tx.user}-${tx.timestamp}`,
              isExiting: false,
            }));

            console.log('[Toast] Adding toasts:', newToasts.length);
            setToasts((prev) => [...newToasts.reverse(), ...prev].slice(0, 5)); // Keep max 5 toasts
            // Update to the newest timestamp (last in ascending order array)
            const newestTimestamp = newTransactions[newTransactions.length - 1].timestamp;
            setLastTimestamp(newestTimestamp);
            console.log('[Toast] Updated lastTimestamp to:', newestTimestamp);

            // Remove toasts after 5 seconds with fade-out animation
            newToasts.forEach((toast: ToastNotification) => {
              setTimeout(() => {
                setToasts((prev) =>
                  prev.map((t) =>
                    t.id === toast.id ? { ...t, isExiting: true } : t
                  )
                );
              }, 4500); // Start fade out after 4.5s

              setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== toast.id));
              }, 5000); // Remove after 5s
            });
          }
        }
      } catch (err) {
        console.error("Error checking for new transactions:", err);
      }
    };

    // Check immediately
    checkForNewTransactions();

    // Then check every 3 seconds for new transactions
    const interval = setInterval(checkForNewTransactions, 3000);
    return () => clearInterval(interval);
  }, [mintAddress, lastTimestamp]);

  console.log('[Toast] Rendering with toasts:', toasts.length);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map((toast) => {
        const isBuy = toast.type === "buy";
        const solAmount = Number(toast.solAmount) / 1_000_000_000;
        const tokenAmount = Number(toast.tokenAmount) / 1_000_000;
        const usdValue = solAmount * solPriceUSD;
        const shortAddress = `${toast.user.slice(0, 4)}...${toast.user.slice(-4)}`;

        return (
          <div
            key={toast.id}
            className={`
              transform transition-all duration-500 pointer-events-auto
              ${toast.isExiting ? "translate-x-full opacity-0" : "translate-x-0 opacity-100"}
            `}
            style={{
              animation: toast.isExiting ? "none" : "slideIn 0.3s ease-out",
            }}
          >
            <div
              className={`
                rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm
                ${
                  isBuy
                    ? "bg-emerald-950/90 border-emerald-500/50"
                    : "bg-red-950/90 border-red-500/50"
                }
              `}
            >
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center
                    ${isBuy ? "bg-emerald-500" : "bg-red-500"}
                  `}
                >
                  {isBuy ? (
                    <svg
                      className="w-5 h-5 text-white"
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
                      className="w-5 h-5 text-white"
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

                {/* Content */}
                <div className="flex-1 min-w-0">
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
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-white font-semibold text-sm">
                      ${usdValue.toFixed(2)}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {tokenAmount.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}{" "}
                      tokens
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
