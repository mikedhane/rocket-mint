"use client";

import { useEffect, useMemo, useState, useRef, useCallback, ChangeEvent } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAccount, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";

export type LaunchDoc = {
  id: string;
  name: string;
  symbol: string;
  description?: string;
  imageUrl?: string | null;
  metadataUrl?: string | null;
  mintAddress: string;
  network?: string;
  platformFeeBps?: number | null;
  creatorFeeBps?: number | null;
  mintSignature?: string | null;
  metadataSignature?: string | null;
  creatorTreasury?: string | null;
  createdAt?: string;
};

type Props = {
  initialLaunches: LaunchDoc[];
};

type NetworkFilter = "all" | "devnet" | "mainnet-beta" | "testnet";

export default function DashboardClient({ initialLaunches }: Props) {
  const router = useRouter();
  const { publicKey } = useWallet();
  const [networkFilter, setNetworkFilter] = useState<NetworkFilter>("all");
  const [search, setSearch] = useState<string>("");
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [copiedMint, setCopiedMint] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(20);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [solPriceUSD, setSolPriceUSD] = useState<number>(100);
  const [tokenPrices, setTokenPrices] = useState<Record<string, number>>({});

  const observerTarget = useRef<HTMLDivElement>(null);

  // Copy swap URL to clipboard
  const copySwapUrl = async (mintAddress: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/swap/${mintAddress}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedMint(mintAddress);
      setTimeout(() => setCopiedMint(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Reset display count whenever filters/search change
  useEffect(() => {
    setDisplayCount(20);
    setHasMore(true);
  }, [networkFilter, search]);

  // Fetch token balances for the connected wallet
  useEffect(() => {
    if (!publicKey || initialLaunches.length === 0) {
      setBalances({});
      return;
    }

    const fetchBalances = async () => {
      setLoadingBalances(true);
      const newBalances: Record<string, string> = {};

      // Get the RPC endpoint based on network
      const getEndpoint = (network: string) => {
        if (network === "mainnet-beta") return "https://solana-mainnet.g.alchemy.com/v2/RVeMfinzUHGfNq_Alf3VR";
        if (network === "testnet") return "https://api.testnet.solana.com";
        return "https://solana-devnet.g.alchemy.com/v2/RVeMfinzUHGfNq_Alf3VR"; // devnet
      };

      // Fetch balance for each mint
      for (const launch of initialLaunches) {
        try {
          const network = launch.network ?? "devnet";
          const connection = new Connection(getEndpoint(network), "confirmed");
          const mintPubkey = new PublicKey(launch.mintAddress);

          // Get the associated token account address
          const ata = getAssociatedTokenAddressSync(
            mintPubkey,
            publicKey,
            false,
            TOKEN_PROGRAM_ID
          );

          // Try to get the account
          const accountInfo = await connection.getAccountInfo(ata);
          if (accountInfo) {
            const account = await getAccount(connection, ata, "confirmed", TOKEN_PROGRAM_ID);
            // Store raw balance as string to preserve precision
            newBalances[launch.mintAddress] = account.amount.toString();
          } else {
            newBalances[launch.mintAddress] = "0";
          }
        } catch (error) {
          console.error(`Error fetching balance for ${launch.mintAddress}:`, error);
          newBalances[launch.mintAddress] = "0";
        }
      }

      setBalances(newBalances);
      setLoadingBalances(false);
    };

    fetchBalances();
  }, [publicKey, initialLaunches]);

  // Fetch SOL price in USD
  useEffect(() => {
    const fetchSolPrice = async () => {
      try {
        const res = await fetch("/api/graduation-target");
        if (res.ok) {
          const data = await res.json();
          setSolPriceUSD(data.solPriceUSD || 100);
        }
      } catch (err) {
        console.error("Failed to fetch SOL price:", err);
      }
    };
    fetchSolPrice();
  }, []);

  // Fetch token prices
  useEffect(() => {
    if (initialLaunches.length === 0) return;

    const fetchPrices = async () => {
      const prices: Record<string, number> = {};

      for (const launch of initialLaunches) {
        try {
          const res = await fetch(`/api/token/${launch.mintAddress}`);
          if (res.ok) {
            const data = await res.json();
            // Calculate current price from bonding curve data (same as swap page)
            if (data.bondingCurve && data.curveState) {
              const tokensSold = BigInt(data.curveState.tokensSold);
              const totalSupply = BigInt(data.bondingCurve.totalSupply);
              const progress = Number(tokensSold) / Number(totalSupply);
              const priceRange = data.bondingCurve.finalPrice - data.bondingCurve.initialPrice;
              const currentPrice = data.bondingCurve.initialPrice + (priceRange * progress);
              // Store as-is (in SOL per token)
              prices[launch.mintAddress] = currentPrice;
            }
          }
        } catch (err) {
          console.error(`Error fetching price for ${launch.mintAddress}:`, err);
        }
      }

      setTokenPrices(prices);
    };

    fetchPrices();
  }, [initialLaunches]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return initialLaunches.filter((launch) => {
      if (networkFilter !== "all") {
        if ((launch.network ?? "devnet") !== networkFilter) return false;
      }

      if (!q) return true;

      const haystack = [
        launch.name ?? "",
        launch.symbol ?? "",
        launch.mintAddress ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [initialLaunches, networkFilter, search]);

  const displayedTokens = useMemo(() => {
    return filtered.slice(0, displayCount);
  }, [filtered, displayCount]);

  // Update hasMore when filtered changes
  useEffect(() => {
    setHasMore(filtered.length > displayCount);
  }, [filtered, displayCount]);

  // Load more tokens
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    setTimeout(() => {
      const newCount = displayCount + 20;
      setDisplayCount(newCount);
      setHasMore(filtered.length > newCount);
      setLoadingMore(false);
    }, 500); // Small delay for smooth UX
  }, [displayCount, filtered, loadingMore, hasMore]);

  // Set up Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, loadMore]);

  // Format balance to human-readable number (assuming 6 decimals by default)
  const formatBalance = (rawBalance: string, decimals: number = 6): string => {
    if (!rawBalance || rawBalance === "0") return "0";
    const balance = BigInt(rawBalance);
    const divisor = BigInt(10) ** BigInt(decimals);
    const integerPart = balance / divisor;
    const fractionalPart = balance % divisor;

    if (fractionalPart === BigInt(0)) {
      return integerPart.toLocaleString();
    }

    const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
    const trimmed = fractionalStr.replace(/0+$/, "");
    return `${integerPart.toLocaleString()}.${trimmed}`;
  };

  // Calculate USD value of token balance
  const calculateBalanceUSD = (mintAddress: string, rawBalance: string): number => {
    if (!rawBalance || rawBalance === "0") return 0;
    const tokenPrice = tokenPrices[mintAddress];
    if (!tokenPrice) return 0;

    // rawBalance is in smallest units (6 decimals)
    // tokenPrice is in lamports per token unit
    // Convert: (balance / 1_000_000) * (tokenPrice * solPriceUSD / 1000)
    const balance = Number(rawBalance) / 1_000_000; // Convert to display units
    const priceInUSD = (tokenPrice * solPriceUSD) / 1000; // Convert lamports to SOL, then to USD
    return balance * priceInUSD;
  };

  return (
    <main className="min-h-screen bg-linear-to-b from-black to-zinc-900 text-white px-6 py-10">
      <div className="mx-auto w-full max-w-5xl">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-1">Meme Coin Launches</h1>
            <p className="text-zinc-400 text-sm">
              {filtered.length === 0
                ? "No launches match your filters."
                : `Showing ${displayedTokens.length} of ${filtered.length} launches.`}
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <span>Network</span>
              <select
                value={networkFilter}
                onChange={(e) =>
                  setNetworkFilter(e.target.value as NetworkFilter)
                }
                className="rounded-lg bg-zinc-900 border border-zinc-700 px-2 py-1 text-xs text-white"
              >
                <option value="all">All</option>
                <option value="devnet">devnet</option>
                <option value="mainnet-beta">mainnet-beta</option>
                <option value="testnet">testnet</option>
              </select>
            </label>

            <input
              type="text"
              placeholder="Search by name / symbol / mint"
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setSearch(e.target.value)
              }
              className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-sm text-white min-w-[220px]"
            />
          </div>
        </header>

        {filtered.length === 0 ? (
          <p className="text-zinc-500">
            Try clearing your filters or mint a new coin on{" "}
            <code>/launch</code>.
          </p>
        ) : (
          <>
            {/* Cards */}
            <div className="grid gap-6 md:grid-cols-2">
              {displayedTokens.map((launch) => (
                <article
                  key={launch.id}
                  onClick={() => router.push(`/swap/${launch.mintAddress}`)}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 flex gap-4 hover:border-violet-600/50 transition cursor-pointer group"
                >
                  {/* Thumbnail */}
                  {launch.imageUrl ? (
                    <div className="w-28 h-28 rounded-xl overflow-hidden shrink-0 border border-zinc-700 bg-zinc-900 flex items-center justify-center">
                      <img
                        src={launch.imageUrl}
                        alt={launch.name || launch.symbol}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-28 h-28 rounded-xl shrink-0 border border-dashed border-zinc-700 flex items-center justify-center text-[11px] text-zinc-500">
                      No image
                    </div>
                  )}

                  {/* Details */}
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="font-semibold text-lg">
                          {launch.name || "Untitled"}{" "}
                          <span className="text-xs text-zinc-400">
                            ({launch.symbol})
                          </span>
                        </h2>
                        <p className="text-xs text-zinc-500">
                          {(launch.network ?? "devnet").toUpperCase()} •{" "}
                          {launch.createdAt
                            ? new Date(
                                launch.createdAt as string
                              ).toLocaleString()
                            : "Time unknown"}
                        </p>
                      </div>
                    </div>

                    {launch.description && (
                      <p className="text-sm text-zinc-300 line-clamp-2">
                        {launch.description}
                      </p>
                    )}

                    <div className="mt-1 space-y-1 text-xs text-zinc-400">
                      <p>
                        Mint:{" "}
                        <code className="break-all">
                          {launch.mintAddress}
                        </code>
                      </p>
                      {publicKey && (
                        <div>
                          <p className="text-sm">
                            <span className="text-zinc-500">Balance: </span>
                            <span className="font-semibold text-emerald-400">
                              {loadingBalances
                                ? "Loading..."
                                : formatBalance(balances[launch.mintAddress] || "0")}{" "}
                              {launch.symbol}
                            </span>
                          </p>
                          <p className="text-xs text-yellow-400 mt-1">
                            Current Price: {tokenPrices[launch.mintAddress]
                              ? `$${((tokenPrices[launch.mintAddress] * solPriceUSD) / 1000).toFixed(6)}`
                              : "Loading..."}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={`/swap/${launch.mintAddress}`}
                        onClick={(e) => e.stopPropagation()}
                        className="px-4 py-1.5 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium transition"
                      >
                        Trade
                      </a>
                      <button
                        onClick={(e) => copySwapUrl(launch.mintAddress, e)}
                        className="px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition"
                      >
                        {copiedMint === launch.mintAddress ? "✓ Copied!" : "📋 Share"}
                      </button>
                      <a
                        href={`https://solscan.io/token/${launch.mintAddress}${
                          launch.network !== "mainnet-beta"
                            ? `?cluster=${launch.network}`
                            : ""
                        }`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-4 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition"
                      >
                        Solscan
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Infinite Scroll Trigger */}
            <div ref={observerTarget} className="py-8 pb-24">
              {loadingMore && (
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
                  <p className="mt-4 text-zinc-400">Loading more launches...</p>
                </div>
              )}
              {!hasMore && filtered.length > 0 && (
                <p className="text-center text-zinc-500 text-sm">
                  You've reached the end • Showing all {filtered.length} launches
                </p>
              )}
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
