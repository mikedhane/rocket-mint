"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { lamportsToSol } from "@/lib/bondingCurve";
import BottomNav from "@/components/BottomNav";
import { APP_VERSION } from "@/lib/version";

type SolanaNetwork = "devnet" | "mainnet-beta" | "testnet";

type TrendingToken = {
  id: string;
  mintAddress: string;
  name: string;
  symbol: string;
  imageUrl: string | null;
  graduated: boolean;
  curveState: {
    tokensRemaining: string;
    tokensSold: string;
    solCollected: string;
  };
};

export default function HomePage() {
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [trendingTokens, setTrendingTokens] = useState<TrendingToken[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<TrendingToken[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [depositMethod, setDepositMethod] = useState<"crypto" | "card">("crypto");
  const [solPriceUsd, setSolPriceUsd] = useState<number | null>(null);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [totalCreatorEarnings, setTotalCreatorEarnings] = useState<{
    totalSOL: number;
    totalUSD: number;
    transactionCount: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);

    // Capture referral code from URL
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref");
    if (refCode) {
      localStorage.setItem("referralCode", refCode);
    }
  }, []);

  // Fetch SOL price in USD
  useEffect(() => {
    const fetchSolPrice = async () => {
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
        );
        const data = await res.json();
        setSolPriceUsd(data.solana?.usd || null);
      } catch (error) {
        console.error("Failed to fetch SOL price:", error);
      }
    };
    fetchSolPrice();
    // Update price every 60 seconds
    const interval = setInterval(fetchSolPrice, 60000);
    return () => clearInterval(interval);
  }, []);

  // Live search as user types
  useEffect(() => {
    const searchTokens = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }

      setSearchLoading(true);
      try {
        const res = await fetch("/api/tokens?limit=10");
        if (!res.ok) return;
        const data = await res.json();

        // Filter tokens based on search query
        const query = searchQuery.toLowerCase();
        const filtered = data.tokens.filter((token: TrendingToken) => {
          const searchableText = [
            token.name,
            token.symbol,
            token.mintAddress,
          ].join(" ").toLowerCase();
          return searchableText.includes(query);
        });

        setSearchResults(filtered.slice(0, 5));
        setShowDropdown(filtered.length > 0);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setSearchLoading(false);
      }
    };

    const debounce = setTimeout(searchTokens, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowDropdown(false);
      router.push(`/marketplace?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Navigate to token
  const goToToken = (mintAddress: string) => {
    setShowDropdown(false);
    setSearchQuery("");
    router.push(`/swap/${mintAddress}`);
  };

  const network: SolanaNetwork =
    (process.env.NEXT_PUBLIC_SOLANA_NETWORK as SolanaNetwork) || "devnet";

  // Fetch trending tokens
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await fetch("/api/tokens?sort=volume&limit=6");
        if (!res.ok) return;
        const data = await res.json();
        setTrendingTokens(data.tokens);
      } catch (error) {
        console.error("Failed to fetch trending tokens:", error);
      }
    };
    fetchTrending();
  }, []);

  // Fetch total creator earnings across network
  useEffect(() => {
    const fetchTotalCreatorEarnings = async () => {
      try {
        const res = await fetch(`/api/total-creator-earnings?network=${network}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.transactionCount > 0 && solPriceUsd) {
          setTotalCreatorEarnings({
            totalSOL: data.totalCreatorFeesSOL,
            totalUSD: data.totalCreatorFeesSOL * solPriceUsd,
            transactionCount: data.transactionCount,
          });
        }
      } catch (error) {
        console.error("Failed to fetch total creator earnings:", error);
      }
    };

    if (solPriceUsd) {
      fetchTotalCreatorEarnings();
    }
  }, [network, solPriceUsd]);

  const endpoint = useMemo(() => {
    const urls: Record<SolanaNetwork, string> = {
      "mainnet-beta": "https://solana-mainnet.g.alchemy.com/v2/RVeMfinzUHGfNq_Alf3VR",
      devnet: "https://solana-devnet.g.alchemy.com/v2/RVeMfinzUHGfNq_Alf3VR",
      testnet: "https://api.testnet.solana.com",
    };
    return urls[network] || urls.devnet;
  }, [network]);

  const connection = useMemo(
    () => new Connection(endpoint, "confirmed"),
    [endpoint]
  );

  // Fetch SOL balance when wallet changes
  useEffect(() => {
    if (!mounted || !publicKey) {
      setSolBalance(null);
      return;
    }
    (async () => {
      try {
        const lamports = await connection.getBalance(publicKey);
        setSolBalance(lamports / LAMPORTS_PER_SOL);
      } catch {
        setSolBalance(null);
      }
    })();
  }, [mounted, publicKey, connection]);

  // Register user with referral code when wallet connects
  useEffect(() => {
    if (!mounted || !publicKey) return;

    const registerUser = async () => {
      try {
        const referralCode = localStorage.getItem("referralCode");

        await fetch("/api/referrals/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet: publicKey.toBase58(),
            referrerCode: referralCode || undefined,
          }),
        });

        // Clean up the referral code after registration
        if (referralCode) {
          localStorage.removeItem("referralCode");
        }
      } catch (error) {
        console.error("Error registering user:", error);
      }
    };

    registerUser();
  }, [mounted, publicKey]);

  const requestAirdrop = useCallback(async () => {
    try {
      if (!publicKey) return;
      setMsg("Requesting 1 SOL airdrop on devnet…");

      const sig = await connection.requestAirdrop(
        new PublicKey(publicKey),
        1 * LAMPORTS_PER_SOL
      );

      // Use robust confirmation with timeout handling
      try {
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        await connection.confirmTransaction(
          {
            signature: sig,
            blockhash,
            lastValidBlockHeight,
          },
          "confirmed"
        );
        setMsg("✅ Airdrop complete! Check your wallet balance.");
      } catch (confirmError) {
        // Check signature status if confirmation times out
        const signatureStatus = await connection.getSignatureStatus(sig);
        if (signatureStatus?.value?.confirmationStatus === "confirmed" ||
            signatureStatus?.value?.confirmationStatus === "finalized") {
          setMsg("✅ Airdrop complete! Check your wallet balance.");
        } else {
          setMsg(`⏳ Airdrop submitted! Check Solana Explorer: https://explorer.solana.com/tx/${sig}?cluster=${network}`);
        }
      }
    } catch (e: any) {
      setMsg(`❌ Airdrop failed: ${e?.message || String(e)}`);
    }
  }, [connection, publicKey, network]);

  const copyAddress = async () => {
    if (!publicKey) return;
    try {
      await navigator.clipboard.writeText(publicKey.toBase58());
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const openMoonPay = () => {
    if (!publicKey) return;

    // MoonPay widget URL with parameters
    const moonpayUrl = new URL("https://buy.moonpay.com");
    moonpayUrl.searchParams.append("apiKey", process.env.NEXT_PUBLIC_MOONPAY_API_KEY || "");
    moonpayUrl.searchParams.append("currencyCode", "sol");
    moonpayUrl.searchParams.append("walletAddress", publicKey.toBase58());
    moonpayUrl.searchParams.append("colorCode", "#8b5cf6"); // violet-600

    // Open MoonPay in a new window
    const width = 500;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    window.open(
      moonpayUrl.toString(),
      "MoonPay",
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-linear-to-b from-zinc-950 to-zinc-900 text-white flex flex-col overflow-x-hidden">
      {/* Top section */}
      <header className="px-4 pt-8 pb-4 md:px-8">
        <div className="mx-auto w-full max-w-2xl">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              {/* Logo */}
              <img
                src="/logo.png"
                alt="Rocket Mint Logo"
                className="w-12 h-12 md:w-14 md:h-14"
              />
              <div>
                <div className="text-[11px] text-zinc-500 uppercase tracking-wide">
                  Rocket-Mint.com Network
                </div>
                <div className="text-sm font-medium text-zinc-200">
                  {network === "devnet" ? "Solana Devnet" : network}
                </div>
                <div className="text-[10px] text-zinc-600 mt-0.5">
                  v{APP_VERSION}
                </div>
              </div>
            </div>
            <WalletMultiButton />
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="mt-4 relative">
            <div className="w-full rounded-full bg-zinc-900 border border-zinc-800 px-4 py-2 text-sm flex items-center gap-2">
              <svg
                className="w-4 h-4 text-zinc-400"
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
                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                placeholder="Search tokens, mints..."
                className="flex-1 bg-transparent outline-none text-white placeholder:text-zinc-500"
              />
              {searchLoading && (
                <div className="animate-spin h-4 w-4 border-2 border-violet-500 border-t-transparent rounded-full"></div>
              )}
              {searchQuery && !searchLoading && (
                <button
                  type="submit"
                  className="text-xs font-medium text-violet-400 hover:text-violet-300 px-2 py-1 rounded-full hover:bg-violet-900/30 transition"
                >
                  Search
                </button>
              )}
            </div>

            {/* Dropdown Results */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden z-50">
                {searchResults.map((token) => (
                  <button
                    key={token.id}
                    onClick={() => goToToken(token.mintAddress)}
                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-zinc-800 transition text-left border-b border-zinc-800 last:border-b-0"
                  >
                    {token.imageUrl ? (
                      <img
                        src={token.imageUrl}
                        alt={token.name}
                        className="w-8 h-8 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-linear-to-br from-violet-600 to-emerald-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {token.symbol.slice(0, 2)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white truncate">
                          {token.name}
                        </span>
                        {token.graduated && <span className="text-xs">🎓</span>}
                      </div>
                      <div className="text-xs text-zinc-400 flex items-center gap-2">
                        <span>{token.symbol}</span>
                        <span>•</span>
                        <span>{lamportsToSol(BigInt(token.curveState.solCollected))} SOL</span>
                      </div>
                    </div>
                    <svg
                      className="w-5 h-5 text-zinc-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                ))}
                <button
                  onClick={handleSearch}
                  className="w-full px-4 py-2 text-xs text-center text-violet-400 hover:bg-zinc-800 font-medium transition"
                >
                  View all results in marketplace →
                </button>
              </div>
            )}

            {/* Click outside to close */}
            {showDropdown && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowDropdown(false)}
              ></div>
            )}
          </form>

          {/* Balance */}
          <div className="mt-6">
            <div className="text-[11px] uppercase tracking-wide text-zinc-400">
              Total balance {network === "mainnet-beta" ? "" : `(${network})`}
            </div>
            <div className="text-3xl md:text-4xl font-semibold mt-1">
              {solBalance !== null ? solBalance.toFixed(4) + " SOL" : "—"}
            </div>
            {solBalance !== null && solPriceUsd !== null && (
              <div className="text-base text-zinc-400 mt-1">
                ≈ ${(solBalance * solPriceUsd).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </div>
            )}
            <div className="text-[11px] text-zinc-500 mt-1">
              Wallet:{" "}
              {connected && publicKey ? (
                <code className="break-all text-[10px] block mt-1 overflow-hidden text-ellipsis">
                  {publicKey.toBase58()}
                </code>
              ) : (
                "Not connected"
              )}
            </div>

            {/* Deposit Button */}
            {connected && publicKey && (
              <button
                onClick={() => setShowDepositModal(true)}
                className="mt-4 w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Deposit SOL
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main scrollable content */}
      <section className="flex-1 overflow-y-auto px-4 pb-28 md:px-8">
        <div className="mx-auto w-full max-w-2xl space-y-6">
          {/* Trending Tokens */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">Trending Tokens</h2>
              <Link
                href="/marketplace"
                className="text-xs text-violet-600 font-medium"
              >
                View all →
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {trendingTokens.length === 0 ? (
                <div className="shrink-0 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 flex items-center justify-center min-w-[200px] h-24">
                  <p className="text-xs text-zinc-500">No tokens yet</p>
                </div>
              ) : (
                trendingTokens.map((token) => (
                  <div
                    key={token.id}
                    onClick={() => router.push(`/swap/${token.mintAddress}`)}
                    className="shrink-0 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3 flex flex-col gap-2 min-w-40 cursor-pointer hover:border-violet-600 transition"
                  >
                    <div className="flex items-center gap-2">
                      {token.imageUrl ? (
                        <img
                          src={token.imageUrl}
                          alt={token.name}
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-linear-to-br from-violet-600 to-emerald-500 flex items-center justify-center text-xs font-bold text-white">
                          {token.symbol.slice(0, 2)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {token.name}
                        </div>
                        <div className="text-xs text-zinc-500">{token.symbol}</div>
                      </div>
                      {token.graduated && <span className="text-xs">🎓</span>}
                    </div>
                    <div className="text-xs text-emerald-500 font-semibold">
                      {lamportsToSol(BigInt(token.curveState.solCollected))} SOL
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Your Launches */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold">Your Launches</h2>
              <Link
                href="/dash"
                className="text-xs text-violet-600 font-medium"
              >
                View dashboard →
              </Link>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">Created tokens</div>
                <div className="text-xs text-zinc-400">
                  See all coins minted with Rocket-Mint
                </div>
              </div>
              <Link
                href="/dash"
                className="text-xs rounded-full bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 transition"
              >
                Dashboard
              </Link>
            </div>
          </div>

          {/* Platform Features - Security Guarantee */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold">Why Rocket-Mint?</h2>
            </div>
            <div className="rounded-2xl border border-emerald-600/30 bg-linear-to-br from-emerald-500/10 to-violet-500/10 p-4 space-y-3">
              {/* Main Feature */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-2xl shrink-0">🔒</div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-emerald-400 mb-1">
                    100% Immutable Token Supply
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Every token launched on Rocket-Mint automatically burns mint authority after creation.
                    This guarantees the total supply is permanently fixed at 1 billion tokens with no possibility
                    of additional minting—ever. Complete transparency and zero rug pull risk.
                  </p>
                </div>
              </div>

              {/* Additional Features */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-emerald-600/20">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  <div>
                    <p className="text-xs font-semibold text-white">Fair Launch Model</p>
                    <p className="text-[10px] text-zinc-400">99% to bonding curve, 1% to creator</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  <div>
                    <p className="text-xs font-semibold text-white">No Freeze Authority</p>
                    <p className="text-[10px] text-zinc-400">Tokens can always trade freely</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  <div>
                    <p className="text-xs font-semibold text-white">On-Chain Verified</p>
                    <p className="text-[10px] text-zinc-400">All guarantees verifiable on Solana</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  <div>
                    <p className="text-xs font-semibold text-white">Instant Liquidity</p>
                    <p className="text-[10px] text-zinc-400">Bonding curve ready at launch</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-emerald-600/20">
                <Link
                  href="/whitepaper"
                  className="block w-full text-center py-2.5 px-4 bg-linear-to-r from-violet-600 to-emerald-600 hover:from-violet-700 hover:to-emerald-700 rounded-lg text-sm font-semibold transition"
                >
                  📄 Read Technical Whitepaper
                </Link>
                <p className="text-[10px] text-center text-emerald-400/80 mt-2">
                  Learn how we guarantee rug pull protection
                </p>
              </div>
            </div>
          </div>

          {/* Total Creator Earnings */}
          {totalCreatorEarnings && totalCreatorEarnings.transactionCount > 0 && (
            <div>
              <div className="rounded-2xl border border-violet-800/50 bg-linear-to-br from-violet-950/60 to-zinc-950/60 p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-violet-400">Total Creator Earnings on Network</h3>
                  <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-1 rounded">
                    {totalCreatorEarnings.transactionCount.toLocaleString()} {totalCreatorEarnings.transactionCount === 1 ? 'trade' : 'trades'}
                  </span>
                </div>
                <div className="text-5xl font-bold text-white mb-2">
                  ${totalCreatorEarnings.totalUSD.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <p className="text-sm text-zinc-400 mb-4">
                  {totalCreatorEarnings.totalSOL.toFixed(6)} SOL paid to all creators
                </p>
                <div className="pt-4 border-t border-violet-900/30">
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    💰 Every token creator earns 1% on every buy and sell transaction. This creates sustainable passive income for builders and incentivizes quality token launches on Rocket-Mint.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Create & Mint */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold">Create & Mint</h2>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
              <p className="text-sm text-zinc-300">
                Launch a new meme coin with SPL or Token-2022, including image,
                metadata, and fees baked in.
              </p>
              <Link
                href="/launch"
                className="block w-full text-center rounded-full bg-violet-600 hover:bg-violet-700 text-white text-sm py-2.5 font-medium transition"
              >
                Launch a Coin
              </Link>
              <p className="text-[11px] text-zinc-500">
                Connected wallet:{" "}
                {connected ? "ready to mint on mainnet-beta" : "connect to start"}
              </p>
            </div>
          </div>

          {/* Dev tools 
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold">Dev Tools</h2>
              <span className="text-[11px] text-zinc-400">devnet only</span>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-2">
              <button
                onClick={requestAirdrop}
                disabled={!connected || network !== "devnet"}
                className="w-full rounded-full bg-zinc-900 text-white text-sm py-2.5 disabled:opacity-40"
              >
                {network === "devnet"
                  ? "Airdrop 1 SOL (devnet)"
                  : "Switch network to devnet"}
              </button>
              <p className="text-[11px] text-zinc-500 min-h-4">{msg}</p>
              <p className="text-[11px] text-zinc-400">
                RPC: <code className="break-all">{endpoint}</code>
              </p>
            </div>
          </div> */}
        </div>
      </section>

      {/* Deposit Modal */}
      {showDepositModal && connected && publicKey && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 max-w-md w-full p-4 sm:p-6 relative max-h-[90vh] overflow-y-auto overflow-x-hidden my-auto">
            {/* Close Button */}
            <button
              onClick={() => setShowDepositModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Deposit SOL</h2>
              <p className="text-sm text-zinc-400">
                Add funds to your wallet
              </p>
            </div>

            {/* Method Selection */}
            <div className="mb-6 flex gap-2">
              <button
                onClick={() => setDepositMethod("crypto")}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition ${
                  depositMethod === "crypto"
                    ? "bg-violet-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                Crypto Transfer
              </button>
              <button
                onClick={() => setDepositMethod("card")}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition ${
                  depositMethod === "card"
                    ? "bg-violet-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                Credit Card
              </button>
            </div>

            {/* Crypto Transfer Method */}
            {depositMethod === "crypto" && (
              <>
                {/* QR Code */}
                <div className="mb-6 flex justify-center">
                  <div className="bg-white p-4 rounded-xl">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${publicKey.toBase58()}`}
                      alt="Wallet QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                </div>

                {/* Wallet Address */}
                <div className="mb-6">
                  <label className="block text-xs text-zinc-400 mb-2">
                    Your Wallet Address ({network})
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 overflow-hidden">
                      <code className="text-xs text-emerald-400 break-all block overflow-wrap-anywhere">
                        {publicKey.toBase58()}
                      </code>
                    </div>
                    <button
                      onClick={copyAddress}
                      className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-medium transition whitespace-nowrap"
                    >
                      {copiedAddress ? "✓ Copied!" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* Instructions */}
                <div className="mb-6 rounded-lg bg-blue-500/10 border border-blue-500/30 p-4">
                  <h3 className="text-sm font-semibold text-blue-400 mb-2">
                    💡 How to Deposit
                  </h3>
                  <ul className="text-xs text-zinc-300 space-y-1.5">
                    <li>1. Copy your wallet address above</li>
                    <li>2. Send SOL from any wallet or exchange</li>
                    <li>3. Wait for blockchain confirmation</li>
                    <li>4. Your balance will update automatically</li>
                  </ul>
                </div>
              </>
            )}

            {/* Credit Card Method */}
            {depositMethod === "card" && (
              <>
                {/* MoonPay Info */}
                <div className="mb-6 text-center">
                  <div className="inline-block bg-linear-to-r from-violet-600 to-purple-600 p-4 rounded-2xl mb-4">
                    <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold mb-2">Buy SOL with Credit Card</h3>
                  <p className="text-sm text-zinc-400 mb-4">
                    Powered by MoonPay - Fast, secure, and instant delivery
                  </p>
                </div>

                {/* Features */}
                <div className="mb-6 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-emerald-400">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Instant Delivery</p>
                      <p className="text-xs text-zinc-400">SOL arrives in your wallet within minutes</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-emerald-400">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Secure Payment</p>
                      <p className="text-xs text-zinc-400">Bank-grade security and fraud protection</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-emerald-400">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Multiple Payment Methods</p>
                      <p className="text-xs text-zinc-400">Visa, Mastercard, Apple Pay, and more</p>
                    </div>
                  </div>
                </div>

                {/* Buy Button */}
                <button
                  onClick={() => setShowComingSoon(true)}
                  className="w-full py-3 px-6 bg-linear-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 rounded-lg text-white font-semibold transition"
                >
                  Buy SOL with Card →
                </button>

                {/* Disclaimer */}
                <div className="mt-4 rounded-lg bg-zinc-800/50 border border-zinc-700 p-3">
                  <p className="text-xs text-zinc-400">
                    <strong>Note:</strong> You'll be redirected to MoonPay to complete your purchase.
                    MoonPay fees apply. Your SOL will be sent directly to:
                    <code className="block mt-1 text-emerald-400 break-all">{publicKey.toBase58()}</code>
                  </p>
                </div>
              </>
            )}

            {/* Devnet Faucets - Only show for crypto method */}
            {network === "devnet" && depositMethod === "crypto" && (
              <div className="mb-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-4">
                <h3 className="text-sm font-semibold text-yellow-400 mb-2">
                  🚰 Devnet Faucets (Free Test SOL)
                </h3>
                <div className="space-y-2">
                  <a
                    href="https://faucet.solana.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-violet-400 hover:text-violet-300 transition"
                  >
                    → Official Solana Faucet
                  </a>
                  <a
                    href="https://solfaucet.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-violet-400 hover:text-violet-300 transition"
                  >
                    → SolFaucet.com
                  </a>
                  <button
                    onClick={() => {
                      requestAirdrop();
                      setShowDepositModal(false);
                    }}
                    className="w-full mt-2 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-xs font-medium transition"
                  >
                    Request 1 SOL Airdrop
                  </button>
                </div>
              </div>
            )}

            {/* Warning - Only show for crypto method */}
            {depositMethod === "crypto" && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3">
                <p className="text-xs text-red-400">
                  ⚠️ Only send SOL on the <strong>{network}</strong> network. Sending to the wrong network will result in loss of funds.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Coming Soon Modal */}
      {showComingSoon && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 max-w-md w-full p-6 relative">
            {/* Close Button */}
            <button
              onClick={() => setShowComingSoon(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Content */}
            <div className="text-center">
              <div className="mb-4 inline-block bg-violet-500/10 p-4 rounded-full">
                <svg className="w-12 h-12 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-2">Coming Soon!</h2>
              <p className="text-zinc-400 mb-6">
                Credit card purchases with MoonPay are currently being set up.
                Please use the crypto transfer method for now.
              </p>
              <button
                onClick={() => setShowComingSoon(false)}
                className="w-full py-2.5 px-4 bg-violet-600 hover:bg-violet-700 rounded-lg text-white font-medium transition"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <BottomNav />
    </main>
  );
}
