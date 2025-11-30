"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { lamportsToSol, formatTokenAmount } from "@/lib/bondingCurve";
import BottomNav from "@/components/BottomNav";

type TokenData = {
  id: string;
  mintAddress: string;
  name: string;
  symbol: string;
  description: string;
  imageUrl: string | null;
  network: string;
  creator: string;
  graduated: boolean;
  graduatedAt: string | null;
  createdAt: string | null;
  bondingCurve: {
    totalSupply: string;
    initialPrice: number;
    finalPrice: number;
    platformFeeBps: number;
    creatorFeeBps: number;
  };
  curveState: {
    tokensRemaining: string;
    tokensSold: string;
    solCollected: string;
  };
};

function MarketplaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [allTokens, setAllTokens] = useState<TokenData[]>([]);
  const [displayedTokens, setDisplayedTokens] = useState<TokenData[]>([]);
  const [filteredTokens, setFilteredTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "graduated">("all");
  const [sortBy, setSortBy] = useState<"recent" | "volume">("recent");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [displayCount, setDisplayCount] = useState(20);
  const [hasMore, setHasMore] = useState(true);
  const [solPriceUSD, setSolPriceUSD] = useState<number>(100); // Default fallback

  const observerTarget = useRef<HTMLDivElement>(null);

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

  // Read search param from URL on mount
  useEffect(() => {
    const search = searchParams.get("search");
    if (search) {
      setSearchQuery(search);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchTokens();
  }, [filter, sortBy]);

  const fetchTokens = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tokens?filter=${filter}&sort=${sortBy}&limit=200`);
      if (!res.ok) throw new Error("Failed to fetch tokens");

      const data = await res.json();
      setAllTokens(data.tokens);
      setFilteredTokens(data.tokens);
      setDisplayedTokens(data.tokens.slice(0, 20));
      setDisplayCount(20);
      setHasMore(data.tokens.length > 20);
    } catch (error) {
      console.error("Error fetching tokens:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter tokens based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTokens(allTokens);
      setDisplayedTokens(allTokens.slice(0, displayCount));
      setHasMore(allTokens.length > displayCount);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = allTokens.filter((token) => {
      const searchableText = [
        token.name,
        token.symbol,
        token.mintAddress,
        token.description,
      ].join(" ").toLowerCase();
      return searchableText.includes(query);
    });

    setFilteredTokens(filtered);
    setDisplayedTokens(filtered.slice(0, displayCount));
    setHasMore(filtered.length > displayCount);
  }, [searchQuery, allTokens, displayCount]);

  // Load more tokens
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    setTimeout(() => {
      const newCount = displayCount + 20;
      setDisplayedTokens(filteredTokens.slice(0, newCount));
      setDisplayCount(newCount);
      setHasMore(filteredTokens.length > newCount);
      setLoadingMore(false);
    }, 500); // Small delay for smooth UX
  }, [displayCount, filteredTokens, loadingMore, hasMore]);

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

  const calculateProgress = (curveState: TokenData["curveState"], totalSupply: string) => {
    const sold = BigInt(curveState.tokensSold);
    const total = BigInt(totalSupply);
    if (total === BigInt(0)) return 0;
    return Number((sold * BigInt(10000)) / total) / 100;
  };

  const calculateMarketCapUSD = (curveState: TokenData["curveState"]) => {
    const solCollected = BigInt(curveState.solCollected);
    const solAmount = Number(lamportsToSol(solCollected));
    const usdAmount = solAmount * solPriceUSD;

    // Format as currency
    if (usdAmount >= 1_000_000) {
      return `$${(usdAmount / 1_000_000).toFixed(2)}M`;
    } else if (usdAmount >= 1_000) {
      return `$${(usdAmount / 1_000).toFixed(2)}K`;
    } else {
      return `$${usdAmount.toFixed(2)}`;
    }
  };

  const calculateCurrentPrice = (bondingCurve: TokenData["bondingCurve"], curveState: TokenData["curveState"]) => {
    const tokensSold = BigInt(curveState.tokensSold);
    const totalSupply = BigInt(bondingCurve.totalSupply);
    const progress = Number(tokensSold) / Number(totalSupply);
    const priceRange = bondingCurve.finalPrice - bondingCurve.initialPrice;
    const currentPrice = bondingCurve.initialPrice + (priceRange * progress);
    // Convert to USD with 6 decimals
    const priceUSD = (currentPrice * solPriceUSD) / 1000;
    return `$${priceUSD.toFixed(6)}`;
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-zinc-950 to-zinc-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <img
              src="/logo.png"
              alt="Rocket Mint Logo"
              className="w-12 h-12 md:w-14 md:h-14"
            />
            <h1 className="text-4xl font-bold">Token Marketplace</h1>
          </div>
          <p className="text-zinc-400 ml-16 md:ml-18">Discover and trade tokens on the bonding curve</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-2xl">
            <svg
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, symbol, or mint address..."
              className="w-full pl-12 pr-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-500 focus:border-violet-600 focus:outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-white transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === "all"
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              All Tokens
            </button>
            <button
              onClick={() => setFilter("active")}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === "active"
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter("graduated")}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === "graduated"
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              Graduated
            </button>
          </div>

          <div className="flex gap-2 ml-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "recent" | "volume")}
              className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
            >
              <option value="recent">Recently Created</option>
              <option value="volume">Highest Volume</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
            <p className="mt-4 text-zinc-400">Loading tokens...</p>
          </div>
        )}

        {/* Token Grid */}
        {!loading && displayedTokens.length === 0 && (
          <div className="text-center py-12">
            <p className="text-zinc-400 text-lg">No tokens found</p>
            <button
              onClick={() => router.push("/launch")}
              className="mt-4 px-6 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg font-medium transition"
            >
              Launch First Token
            </button>
          </div>
        )}

        {!loading && displayedTokens.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedTokens.map((token) => {
                const progress = calculateProgress(token.curveState, token.bondingCurve.totalSupply);
                const marketCapUSD = calculateMarketCapUSD(token.curveState);
                const currentPrice = calculateCurrentPrice(token.bondingCurve, token.curveState);

                return (
                  <div
                    key={token.id}
                    onClick={() => router.push(`/swap/${token.mintAddress}`)}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 hover:border-violet-600/50 transition cursor-pointer group"
                  >
                    {/* Token Header */}
                    <div className="flex items-start gap-4 mb-4">
                      {token.imageUrl ? (
                        <img
                          src={token.imageUrl}
                          alt={token.name}
                          className="w-16 h-16 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-linear-to-br from-violet-600 to-emerald-500 flex items-center justify-center text-2xl font-bold">
                          {token.symbol.slice(0, 2)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-bold truncate">{token.name}</h3>
                          {token.graduated && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-linear-to-r from-yellow-500 to-orange-500 text-white rounded-full">
                              🎓
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-400">{token.symbol}</p>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-zinc-400 mb-4 line-clamp-2">
                      {token.description || "No description"}
                    </p>

                    {/* Stats */}
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Market Cap</span>
                        <span className="font-semibold text-emerald-400">
                          {marketCapUSD}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Current Price</span>
                        <span className="font-semibold text-yellow-400">
                          {currentPrice}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Progress</span>
                        <span className="font-semibold">{progress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-linear-to-r from-violet-600 to-emerald-500"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/swap/${token.mintAddress}`);
                      }}
                      className="w-full py-2 px-4 bg-violet-600 hover:bg-violet-700 group-hover:bg-violet-700 rounded-lg font-medium transition"
                    >
                      {token.graduated ? "Trade on DEX" : "Buy Tokens"}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Infinite Scroll Trigger */}
            <div ref={observerTarget} className="py-8">
              {loadingMore && (
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
                  <p className="mt-4 text-zinc-400">Loading more tokens...</p>
                </div>
              )}
              {!hasMore && filteredTokens.length > 0 && (
                <p className="text-center text-zinc-500 text-sm">
                  You've reached the end • Showing all {filteredTokens.length} tokens
                </p>
              )}
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-linear-to-b from-zinc-950 to-zinc-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
          <p className="mt-4 text-zinc-400">Loading marketplace...</p>
        </div>
      </div>
    }>
      <MarketplaceContent />
    </Suspense>
  );
}
