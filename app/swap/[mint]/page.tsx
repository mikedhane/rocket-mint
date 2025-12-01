"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  Connection,
  Transaction,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import {
  getAccount,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  BondingCurveConfig,
  BondingCurveState,
  calculateTokensForSol,
  calculateSolForTokens,
  getCurrentPrice,
  lamportsToSol,
  formatTokenAmount,
} from "@/lib/bondingCurve";
import BottomNav from "@/components/BottomNav";
import RecentTransactions, { RecentTransactionsRef } from "@/components/RecentTransactions";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type TokenData = {
  mintAddress: string;
  name: string;
  symbol: string;
  description: string;
  imageUrl: string | null;
  network: string;
  creator: string;
  curveReserveWallet: string;
  graduated: boolean;
  graduatedAt: string | null;
  bondingCurve: BondingCurveConfig;
  website?: string | null;
  twitter?: string | null;
};

type SolanaNetwork = "devnet" | "mainnet-beta" | "testnet";

export default function SwapPage() {
  const params = useParams();
  const mint = params?.mint as string;
  const { connected, publicKey, signTransaction } = useWallet();

  const [mounted, setMounted] = useState(false);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [curveState, setCurveState] = useState<BondingCurveState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);

  // Ref for RecentTransactions component to trigger manual refresh
  const recentTransactionsRef = useRef<RecentTransactionsRef>(null);

  // Graduation target state
  const [graduationTarget, setGraduationTarget] = useState<{
    targetUSD: number;
    solPriceUSD: number;
    solNeeded: number;
  } | null>(null);

  // Swap state
  const [swapMode, setSwapMode] = useState<"buy" | "sell">("buy");
  const [inputAmount, setInputAmount] = useState("");
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);

  // User token balance state
  const [userTokenBalance, setUserTokenBalance] = useState<number>(0);

  // User P&L tracking
  const [userCostBasis, setUserCostBasis] = useState<number>(0); // Total USD spent on purchases

  // Chart time period filter
  const [chartPeriod, setChartPeriod] = useState<"live" | "1h" | "1d" | "4h" | "max">("max");

  // Token holder count
  const [holderCount, setHolderCount] = useState<number>(0);

  // Creator earnings state
  const [creatorEarnings, setCreatorEarnings] = useState<{
    totalSOL: number;
    totalUSD: number;
    transactionCount: number;
  } | null>(null);

  const network: SolanaNetwork =
    (tokenData?.network as SolanaNetwork) || "devnet";

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

  useEffect(() => {
    setMounted(true);
  }, []);

  // Copy share URL to clipboard
  const copyShareUrl = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Copy token address to clipboard
  const copyTokenAddress = async () => {
    try {
      if (!mint) return;
      await navigator.clipboard.writeText(mint);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Fetch token data
  useEffect(() => {
    if (!mint) return;

    let isFirstLoad = true;

    const fetchTokenData = async () => {
      try {
        // Only show loading spinner on first load, not on background refreshes
        if (isFirstLoad) {
          setLoading(true);
        }

        const res = await fetch(`/api/token/${mint}`);
        if (!res.ok) throw new Error("Token not found");

        const data = await res.json();

        // Convert string values to BigInt for bondingCurve
        const tokenDataWithBigInts = {
          ...data,
          bondingCurve: {
            ...data.bondingCurve,
            totalSupply: BigInt(data.bondingCurve.totalSupply),
          },
        };
        setTokenData(tokenDataWithBigInts);

        // Set curve state from API
        if (data.curveState) {
          setCurveState({
            tokensRemaining: BigInt(data.curveState.tokensRemaining),
            tokensSold: BigInt(data.curveState.tokensSold),
            solCollected: BigInt(data.curveState.solCollected),
          });
        }

        // Successfully loaded, turn off loading state on first load
        if (isFirstLoad) {
          isFirstLoad = false;
          setLoading(false);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load token");
        // Always turn off loading state on error
        if (isFirstLoad) {
          isFirstLoad = false;
        }
        setLoading(false);
      }
    };

    fetchTokenData();

    // Refresh token data every 5 seconds for live updates (silently in background)
    const interval = setInterval(fetchTokenData, 5000);
    return () => clearInterval(interval);
  }, [mint]);

  // Fetch graduation target based on current SOL price
  useEffect(() => {
    if (!network) return;

    const fetchGraduationTarget = async () => {
      try {
        const res = await fetch(`/api/graduation-target?network=${network}`);
        if (!res.ok) throw new Error("Failed to fetch graduation target");

        const data = await res.json();
        setGraduationTarget({
          targetUSD: data.targetUSD,
          solPriceUSD: data.solPriceUSD,
          solNeeded: data.solNeeded,
        });
      } catch (err) {
        console.error("Failed to fetch graduation target:", err);
        // Use fallback values - $1M for all networks
        setGraduationTarget({
          targetUSD: 1_000_000,
          solPriceUSD: 100,
          solNeeded: 10_000,
        });
      }
    };

    fetchGraduationTarget();
  }, [network]);

  // Fetch transaction history for price chart
  useEffect(() => {
    if (!mint) return;

    const fetchTransactions = async () => {
      try {
        const res = await fetch(`/api/transactions?mintAddress=${mint}&limit=200`);
        const data = await res.json();

        // If there are no transactions yet, just show empty chart
        if (data.transactions) {
          setTransactions(data.transactions);
        } else {
          setTransactions([]);
        }
      } catch (err) {
        // Silently fail - chart will show "No price data" message
        console.log("No transaction history yet");
        setTransactions([]);
      }
    };

    fetchTransactions();

    // Refresh transaction history every 5 seconds for live chart updates
    const interval = setInterval(fetchTransactions, 5000);
    return () => clearInterval(interval);
  }, [mint]);

  // Fetch user's token balance when wallet is connected
  useEffect(() => {
    if (!connected || !publicKey || !mint) {
      setUserTokenBalance(0);
      return;
    }

    const fetchUserBalance = async () => {
      try {
        const mintPubkey = new PublicKey(mint);
        const userATA = getAssociatedTokenAddressSync(
          mintPubkey,
          publicKey,
          false,
          TOKEN_PROGRAM_ID
        );

        const accountInfo = await connection.getAccountInfo(userATA);
        if (!accountInfo) {
          setUserTokenBalance(0);
          return;
        }

        const tokenAccount = await getAccount(
          connection,
          userATA,
          "confirmed",
          TOKEN_PROGRAM_ID
        );

        // Token has 6 decimals
        const balance = Number(tokenAccount.amount) / 1_000_000;
        setUserTokenBalance(balance);
      } catch (err) {
        console.error("Error fetching token balance:", err);
        setUserTokenBalance(0);
      }
    };

    fetchUserBalance();

    // Refresh balance every 10 seconds
    const interval = setInterval(fetchUserBalance, 10000);
    return () => clearInterval(interval);
  }, [connected, publicKey, mint, connection]);

  // Fetch user's transaction history to calculate cost basis
  useEffect(() => {
    if (!connected || !publicKey || !mint || !graduationTarget) {
      setUserCostBasis(0);
      return;
    }

    const fetchUserTransactions = async () => {
      try {
        const res = await fetch(`/api/transactions?mintAddress=${mint}&user=${publicKey.toBase58()}`);
        const data = await res.json();

        if (data.transactions && data.transactions.length > 0) {
          // Calculate total cost basis from buy transactions
          let totalSpentUSD = 0;

          data.transactions.forEach((tx: any) => {
            if (tx.type === "buy") {
              // Convert SOL amount to USD at the time of purchase
              const solAmount = Number(tx.solAmount) / 1_000_000_000; // Convert from lamports
              const usdAmount = solAmount * graduationTarget.solPriceUSD;
              totalSpentUSD += usdAmount;
            } else if (tx.type === "sell") {
              // Subtract sold value from cost basis
              const solAmount = Number(tx.solAmount) / 1_000_000_000;
              const usdAmount = solAmount * graduationTarget.solPriceUSD;
              totalSpentUSD -= usdAmount;
            }
          });

          setUserCostBasis(Math.max(0, totalSpentUSD));
        } else {
          setUserCostBasis(0);
        }
      } catch (err) {
        console.error("Error fetching user transactions:", err);
        setUserCostBasis(0);
      }
    };

    fetchUserTransactions();
  }, [connected, publicKey, mint, graduationTarget]);

  // Fetch token holder count
  useEffect(() => {
    if (!mint) {
      setHolderCount(0);
      return;
    }

    const fetchHolderCount = async () => {
      try {
        // Fetch holder count from API endpoint (avoids CORS issues on live domain)
        const res = await fetch(`/api/holder-count?mint=${mint}&network=${network}`);
        if (res.ok) {
          const data = await res.json();
          setHolderCount(data.holderCount || 0);
        } else {
          setHolderCount(0);
        }
      } catch (err) {
        console.error("Error fetching holder count:", err);
        setHolderCount(0);
      }
    };

    fetchHolderCount();

    // Refresh holder count every 30 seconds
    const interval = setInterval(fetchHolderCount, 30000);
    return () => clearInterval(interval);
  }, [mint, network]);

  // Fetch creator earnings
  useEffect(() => {
    if (!mint || !graduationTarget) {
      setCreatorEarnings(null);
      return;
    }

    const fetchCreatorEarnings = async () => {
      try {
        const res = await fetch(`/api/creator-earnings?mintAddress=${mint}`);
        if (res.ok) {
          const data = await res.json();
          setCreatorEarnings({
            totalSOL: data.totalCreatorFeesSOL,
            totalUSD: data.totalCreatorFeesSOL * graduationTarget.solPriceUSD,
            transactionCount: data.transactionCount,
          });
        } else {
          setCreatorEarnings(null);
        }
      } catch (err) {
        console.error("Error fetching creator earnings:", err);
        setCreatorEarnings(null);
      }
    };

    fetchCreatorEarnings();

    // Refresh creator earnings every 30 seconds
    const interval = setInterval(fetchCreatorEarnings, 30000);
    return () => clearInterval(interval);
  }, [mint, graduationTarget]);

  // Calculate current price first (needed for swap preview)
  const currentPrice = useMemo(() => {
    if (!tokenData || !curveState) return 0;
    return getCurrentPrice(tokenData.bondingCurve, curveState.tokensSold);
  }, [tokenData, curveState]);

  // Calculate swap preview
  const swapPreview = useMemo(() => {
    if (!tokenData || !curveState || !inputAmount || Number(inputAmount) <= 0) {
      return null;
    }

    try {
      if (swapMode === "buy") {
        // Convert USD to SOL, then calculate tokens
        const solAmount = graduationTarget
          ? BigInt(Math.floor((Number(inputAmount) / graduationTarget.solPriceUSD) * LAMPORTS_PER_SOL))
          : BigInt(Math.floor(Number(inputAmount) * LAMPORTS_PER_SOL)); // Fallback if no USD price
        return calculateTokensForSol(
          tokenData.bondingCurve,
          curveState,
          solAmount
        );
      } else {
        // Sell mode: Convert USD to token amount
        // Ensure we have all required data for USD conversion
        if (graduationTarget && graduationTarget.solPriceUSD && currentPrice > 0) {
          // USD amount * 1000 / (currentPrice * solPriceUSD) = display tokens
          const displayTokens = (Number(inputAmount) * 1000) / (currentPrice * graduationTarget.solPriceUSD);

          console.log("Sell USD calculation:", {
            inputAmount,
            currentPrice,
            solPriceUSD: graduationTarget.solPriceUSD,
            displayTokens,
            rawTokensBeforeRound: displayTokens * 1_000_000,
          });

          // Validate that the calculation produced a reasonable number
          if (!isFinite(displayTokens) || displayTokens <= 0) {
            console.error("Invalid displayTokens calculation:", displayTokens);
            return null;
          }

          // Round to integer before converting to BigInt to avoid floating-point precision issues
          const rawTokens = Math.round(displayTokens * 1_000_000);
          const tokenAmount = BigInt(rawTokens);

          // Check if trying to sell more tokens than have been sold from the curve
          if (tokenAmount > curveState.tokensSold) {
            console.warn("Cannot sell more tokens than have been sold from curve:", {
              trying: tokenAmount.toString(),
              available: curveState.tokensSold.toString(),
            });
            return null;
          }

          console.log("Selling token amount:", {
            rawTokens,
            tokenAmount: tokenAmount.toString(),
          });

          const result = calculateSolForTokens(
            tokenData.bondingCurve,
            curveState,
            tokenAmount
          );
          console.log("Sell result:", result);
          return result;
        } else {
          console.warn("⚠️ Sell mode requires graduationTarget and currentPrice. Missing:", {
            hasGraduationTarget: !!graduationTarget,
            hasSolPriceUSD: !!graduationTarget?.solPriceUSD,
            currentPrice,
            inputAmount,
          });
          // Don't fallback - return null to show we're not ready yet
          return null;
        }
      }
    } catch (err: any) {
      console.error("Preview error:", err);
      return null;
    }
  }, [tokenData, curveState, inputAmount, swapMode, graduationTarget, currentPrice]);

  // Calculate USD value of user's holdings
  const userHoldingsUSD = useMemo(() => {
    if (!userTokenBalance || !currentPrice || !graduationTarget) return 0;
    // userTokenBalance (display tokens) * 1M (to raw units) * currentPrice (lamports/raw unit) / 1B (lamports to SOL) * SOL/USD
    // Simplified: userTokenBalance * currentPrice * solPriceUSD / 1000
    return (userTokenBalance * currentPrice * graduationTarget.solPriceUSD) / 1000;
  }, [userTokenBalance, currentPrice, graduationTarget]);

  // Calculate P&L (Profit/Loss)
  const userPnL = useMemo(() => {
    if (!userHoldingsUSD || userCostBasis === 0) {
      return { amount: 0, percentage: 0, isProfit: true };
    }

    const pnlAmount = userHoldingsUSD - userCostBasis;
    const pnlPercentage = (pnlAmount / userCostBasis) * 100;

    return {
      amount: pnlAmount,
      percentage: pnlPercentage,
      isProfit: pnlAmount >= 0,
    };
  }, [userHoldingsUSD, userCostBasis]);

  // Validate minimum amount
  const isAmountValid = useMemo(() => {
    const amount = Number(inputAmount);
    if (graduationTarget) {
      // For both buy and sell mode, minimum is $0.04 worth of SOL in USD
      const minUSD = 0.04 * graduationTarget.solPriceUSD;
      return amount >= minUSD || inputAmount === "";
    }
    // Fallback minimum
    return amount >= 0.04 || inputAmount === "";
  }, [inputAmount, graduationTarget]);

  // Generate price chart data from real transactions
  const priceChartData = useMemo(() => {
    if (transactions.length === 0) return [];

    // Format transactions for the chart
    return transactions.map((tx, index) => {
      const date = new Date(tx.timestamp);
      const timeLabel = `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

      return {
        label: timeLabel,
        price: tx.price,
        priceUSD: tx.price * (graduationTarget?.solPriceUSD || 100),
        type: tx.type, // 'buy' or 'sell'
        index: index,
        timestamp: date.getTime(),
      };
    });
  }, [transactions, graduationTarget]);

  // Filter chart data based on selected time period
  const filteredChartData = useMemo(() => {
    if (priceChartData.length === 0) return [];

    const now = Date.now();
    let cutoffTime: number;

    switch (chartPeriod) {
      case "live":
        // Last 5 minutes
        cutoffTime = now - 5 * 60 * 1000;
        break;
      case "1h":
        // Last hour
        cutoffTime = now - 60 * 60 * 1000;
        break;
      case "1d":
        // Last 24 hours
        cutoffTime = now - 24 * 60 * 60 * 1000;
        break;
      case "4h":
        // Last 4 hours
        cutoffTime = now - 4 * 60 * 60 * 1000;
        break;
      case "max":
      default:
        // All data
        return priceChartData;
    }

    const filtered = priceChartData.filter((data) => data.timestamp >= cutoffTime);

    // If no data in the time range, use the most recent point
    const dataToDisplay = filtered.length > 0 ? filtered : priceChartData.slice(-1);

    // If only 1 data point, duplicate it to create a line instead of just a dot
    if (dataToDisplay.length === 1) {
      const point = dataToDisplay[0];
      return [
        {
          ...point,
          timestamp: point.timestamp - 60000,
          label: "start",
          price: point.price * 0.99999, // Slightly lower to create visible slope
          priceUSD: point.priceUSD * 0.99999
        },
        point
      ];
    }

    return dataToDisplay;
  }, [priceChartData, chartPeriod]);

  const executeSwap = useCallback(async () => {
    try {
      if (!connected || !publicKey || !signTransaction) {
        throw new Error("Connect wallet first");
      }
      if (!tokenData || !curveState || !swapPreview) {
        throw new Error("Invalid swap parameters");
      }

      // Validate minimum transaction amount
      const amount = Number(inputAmount);
      if (amount < 0.04) {
        throw new Error("Minimum transaction amount is 0.04");
      }

      setStatus("Building transaction...");

      // Call server-side API to build UNSIGNED transaction
      // For buy mode: send SOL amount
      // For sell mode: send token amount (in display units, API will convert to raw units)
      let amountToSend: string;
      if (swapMode === "buy") {
        // Convert USD to SOL amount
        const solAmount = graduationTarget
          ? (Number(inputAmount) / graduationTarget.solPriceUSD)
          : Number(inputAmount);
        amountToSend = solAmount.toString();
      } else {
        // Calculate token amount from USD: USD / (price per token in USD)
        // price per token in USD = (currentPrice in lamports/token * SOL price USD) / 1000
        const pricePerTokenUSD = (currentPrice * (graduationTarget?.solPriceUSD || 100)) / 1000;
        const displayTokens = Number(inputAmount) / pricePerTokenUSD;
        amountToSend = displayTokens.toString();
      }

      const res = await fetch("/api/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mintAddress: mint,
          userWallet: publicKey.toBase58(),
          mode: swapMode,
          amount: amountToSend,
          network,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Swap API failed");
      }

      const { transaction: txBase64, blockhash, lastValidBlockHeight, newState, transactionData } = await res.json();

      // Deserialize the UNSIGNED transaction
      const txBuffer = Buffer.from(txBase64, "base64");
      const tx = Transaction.from(txBuffer);

      setStatus("Requesting wallet signature...");

      // Step 1: Phantom wallet signs FIRST (per Phantom security guidelines)
      const signedTx = await signTransaction(tx);

      setStatus("Finalizing transaction...");

      // Step 2: Send Phantom-signed transaction to backend to add reserve wallet signature
      const finalizeRes = await fetch("/api/swap/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mintAddress: mint,
          signedTransaction: Buffer.from(signedTx.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
          })).toString("base64"),
          network,
        }),
      });

      if (!finalizeRes.ok) {
        const error = await finalizeRes.json();
        throw new Error(error.error || "Failed to finalize swap");
      }

      const { signature: sig } = await finalizeRes.json();

      setStatus("Confirming...");

      // Wait for confirmation using the same blockhash from the transaction
      try {
        const confirmation = await connection.confirmTransaction({
          signature: sig,
          blockhash,
          lastValidBlockHeight,
        }, "confirmed");

        if (confirmation.value.err) {
          throw new Error("Transaction failed");
        }
      } catch (confirmErr: any) {
        // If confirmation times out, check if transaction actually succeeded
        if (confirmErr.message?.includes("block height exceeded")) {
          setStatus("Checking transaction status...");
          try {
            const txStatus = await connection.getSignatureStatus(sig);
            if (txStatus?.value?.confirmationStatus === "confirmed" ||
                txStatus?.value?.confirmationStatus === "finalized") {
              // Transaction actually succeeded!
              console.log("Transaction succeeded despite timeout");
            } else {
              throw confirmErr; // Re-throw if actually failed
            }
          } catch {
            throw confirmErr; // Re-throw original error
          }
        } else {
          throw confirmErr;
        }
      }

      // Record transaction AFTER confirmation
      try {
        await fetch("/api/swap/record", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mintAddress: mint,
            userWallet: publicKey.toBase58(),
            mode: swapMode,
            price: transactionData.price,
            tokenAmount: transactionData.tokenAmount,
            solAmount: transactionData.solAmount,
            platformFeeLamports: transactionData.platformFeeLamports,
            creatorFeeLamports: transactionData.creatorFeeLamports,
            network,
          }),
        });

        // Immediately refresh recent transactions display
        recentTransactionsRef.current?.refresh();
      } catch (recordErr) {
        console.error("Failed to record transaction:", recordErr);
        // Don't fail the whole swap if recording fails
      }

      // Update local state
      setCurveState({
        tokensRemaining: BigInt(newState.tokensRemaining),
        tokensSold: BigInt(newState.tokensSold),
        solCollected: BigInt(newState.solCollected),
      });

      setStatus(`✅ Swap successful! Signature: ${sig.slice(0, 8)}...`);
      setInputAmount("");

      // Refresh transaction history and user balance immediately
      try {
        const res = await fetch(`/api/transactions?mintAddress=${mint}&limit=200`);
        const data = await res.json();
        if (data.transactions) {
          setTransactions(data.transactions);
        }
      } catch (refreshErr) {
        console.error("Error refreshing transactions:", refreshErr);
      }

      // Refresh user's token balance
      if (publicKey) {
        try {
          const mintPubkey = new PublicKey(mint);
          const userATA = getAssociatedTokenAddressSync(
            mintPubkey,
            publicKey,
            false,
            TOKEN_PROGRAM_ID
          );

          const accountInfo = await connection.getAccountInfo(userATA);
          if (accountInfo) {
            const tokenAccount = await getAccount(
              connection,
              userATA,
              "confirmed",
              TOKEN_PROGRAM_ID
            );
            const balance = Number(tokenAccount.amount) / 1_000_000;
            setUserTokenBalance(balance);
          }
        } catch (balanceErr) {
          console.error("Error refreshing balance:", balanceErr);
        }
      }
    } catch (err: any) {
      console.error(err);

      // Better error messages for common scenarios
      if (err.message?.includes("User rejected") || err.name === "WalletSignTransactionError") {
        setStatus("❌ Transaction cancelled");
      } else if (err.message?.includes("Insufficient")) {
        setStatus(`❌ ${err.message}`);
      } else {
        setStatus(`❌ Swap failed: ${err.message || String(err)}`);
      }

      // Clear error after 5 seconds so user can try again
      setTimeout(() => {
        setStatus("");
      }, 5000);
    }
  }, [
    connected,
    publicKey,
    signTransaction,
    tokenData,
    curveState,
    swapPreview,
    inputAmount,
    swapMode,
    mint,
    network,
    connection,
    graduationTarget,
    currentPrice,
  ]);

  if (!mounted) return null;

  if (loading) {
    return (
      <main className="min-h-screen bg-linear-to-b from-black to-zinc-900 text-white px-6 py-10 flex items-center justify-center">
        <p>Loading token data...</p>
      </main>
    );
  }

  if (error || !tokenData) {
    return (
      <main className="min-h-screen bg-linear-to-b from-black to-zinc-900 text-white px-6 py-10 flex items-center justify-center">
        <p>❌ {error || "Token not found"}</p>
      </main>
    );
  }

  const progress = curveState
    ? (Number(curveState.tokensSold) /
        Number(tokenData.bondingCurve.totalSupply)) *
      100
    : 0;

  return (
    <main className="min-h-screen bg-linear-to-b from-black to-zinc-900 text-white px-6 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Rocket-Mint Token</h1>
          <WalletMultiButton />
        </div>

        {/* Warning Banner */}
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-yellow-500 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1">
              <h3 className="font-bold text-yellow-500 mb-1">Warning: New & Unverified Token</h3>
              <p className="text-sm text-zinc-300">
                This token is new and has not been verified. Always do your own research before investing. Only invest what you can afford to lose.
              </p>
            </div>
          </div>
        </div>

        {/* Token Info Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 mb-6">
          <div className="flex gap-4 items-start">
            {tokenData.imageUrl && (
              <img
                src={tokenData.imageUrl}
                alt={tokenData.name}
                className="w-20 h-20 rounded-xl object-cover"
              />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold">
                  {tokenData.name}{" "}
                  <span className="text-zinc-400">({tokenData.symbol})</span>
                </h2>
                {tokenData.graduated && (
                  <span className="px-2 py-1 text-xs font-semibold bg-linear-to-r from-yellow-500 to-orange-500 text-white rounded-full">
                    🎓 GRADUATED
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-400 mt-1">
                {tokenData.description}
              </p>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <p className="text-xs text-zinc-500">
                  Network: {network.toUpperCase()}
                </p>
                <button
                  onClick={copyTokenAddress}
                  className="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition flex items-center gap-1"
                >
                  {copied ? (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      {mint ? `${mint.slice(0, 4)}...${mint.slice(-4)}` : "Copy Address"}
                    </>
                  )}
                </button>
                {tokenData.website && (
                  <a
                    href={tokenData.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    Website
                  </a>
                )}
                {tokenData.twitter && (
                  <a
                    href={tokenData.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    X/Twitter
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Bonding Curve Progress */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Bonding Curve Progress</span>
              <span className="text-sm font-semibold">{progress.toFixed(2)}%</span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-violet-600 to-emerald-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-zinc-500">
              <span>Current Price: {currentPrice.toFixed(9)} SOL</span>
              <span>
                {curveState &&
                  formatTokenAmount(curveState.tokensSold, 6)} /{" "}
                {formatTokenAmount(tokenData.bondingCurve.totalSupply, 6)} sold
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-zinc-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Graduation Target:</span>
                <span className="font-semibold text-emerald-400">
                  {curveState && graduationTarget
                    ? `$${(Number(lamportsToSol(curveState.solCollected)) * graduationTarget.solPriceUSD).toLocaleString(undefined, { maximumFractionDigits: 0 })} / $${graduationTarget.targetUSD.toLocaleString()}`
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-2">
                <span className="text-zinc-400">Token Holders:</span>
                <span className="font-semibold text-violet-400">
                  {holderCount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-2">
                <span className="text-zinc-400">Market Cap:</span>
                <span className="font-semibold text-emerald-400">
                  {curveState && graduationTarget
                    ? `$${(Number(lamportsToSol(curveState.solCollected)) * graduationTarget.solPriceUSD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-2">
                <span className="text-zinc-400">Current Price:</span>
                <span className="font-semibold text-yellow-400">
                  {graduationTarget
                    ? `$${((currentPrice * graduationTarget.solPriceUSD) / 1000).toFixed(6)}`
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Creator Earnings Card */}
        {creatorEarnings && creatorEarnings.transactionCount > 0 && (
          <div className="rounded-2xl border border-violet-800/50 bg-linear-to-br from-violet-950/60 to-zinc-950/60 p-6 mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-violet-400">Creator Earnings (1% Fee)</h3>
              <span className="text-xs text-zinc-500 bg-zinc-900 px-2 py-1 rounded">
                {creatorEarnings.transactionCount} {creatorEarnings.transactionCount === 1 ? 'trade' : 'trades'}
              </span>
            </div>
            <div className="text-4xl font-bold text-white mb-1">
              ${creatorEarnings.totalUSD.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-sm text-zinc-400">
              {creatorEarnings.totalSOL.toFixed(6)} SOL earned from trading fees
            </p>
            <p className="text-xs text-zinc-500 mt-3 pt-3 border-t border-violet-900/30">
              💰 Creators earn 1% on every buy and sell transaction. This creates passive income for token creators.
            </p>
          </div>
        )}

        {/* User Holdings Card */}
        {connected && userTokenBalance > 0 && (
          <div className="rounded-2xl border border-emerald-800/50 bg-linear
          -to-br from-emerald-950/60 to-zinc-950/60 p-6 mb-6">
            <h3 className="text-sm font-medium text-emerald-400 mb-2">Your Holdings</h3>
            <div className="text-5xl font-bold text-white mb-3">
              ${userHoldingsUSD.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-lg text-zinc-400">
              {userTokenBalance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 6,
              })}{" "}
              {tokenData.symbol}
            </p>
            {userCostBasis > 0 && (
              <div className="mt-3 pt-3 border-t border-emerald-900/30">
                <div className={`flex items-center gap-2 ${userPnL.isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                  <span className="text-2xl font-bold">
                    {userPnL.isProfit ? '+' : '-'}${Math.abs(userPnL.amount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className={`text-sm font-semibold px-2 py-1 rounded ${userPnL.isProfit ? 'bg-emerald-900/30' : 'bg-red-900/30'}`}>
                    {userPnL.isProfit ? '+' : ''}{userPnL.percentage.toFixed(2)}%
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  {userPnL.isProfit ? 'Unrealized Gain' : 'Unrealized Loss'} • Cost Basis: ${userCostBasis.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-emerald-900/30 flex items-center justify-between text-xs text-zinc-500">
              <span>Token Price: {currentPrice.toFixed(9)} SOL</span>
              <span>
                SOL/USD: ${graduationTarget?.solPriceUSD.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Price Chart - Dark Theme */}
        <div className="rounded-2xl border border-zinc-800 bg-black p-8 mb-6">
          {/* Large Price Display */}
          <div className="mb-6">
            <div className="text-5xl font-bold text-white mb-2">
              {graduationTarget
                ? `$${((currentPrice * graduationTarget.solPriceUSD) / 1000).toFixed(8)}`
                : "$0.00000000"}
            </div>
            {filteredChartData.length >= 2 && (
              <div className="flex items-center gap-2 text-sm">
                {(() => {
                  const firstPrice = filteredChartData[0]?.priceUSD || 0;
                  const lastPrice = filteredChartData[filteredChartData.length - 1]?.priceUSD || 0;
                  const change = lastPrice - firstPrice;
                  const changePercent = firstPrice > 0 ? (change / firstPrice) * 100 : 0;
                  const isPositive = change >= 0;

                  return (
                    <>
                      <span className={isPositive ? "text-emerald-500" : "text-red-500"}>
                        {isPositive ? "▲" : "▼"}
                      </span>
                      <span className={`font-semibold ${isPositive ? "text-emerald-500" : "text-red-500"}`}>
                        ${Math.abs(change).toFixed(8)} ({Math.abs(changePercent).toFixed(2)}%)
                      </span>
                      <span className="text-zinc-400">
                        {chartPeriod === "live" ? "Past 5 min" :
                         chartPeriod === "1h" ? "Past hour" :
                         chartPeriod === "1d" ? "Past day" :
                         chartPeriod === "4h" ? "Past 4 hours" : "All time"}
                      </span>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Chart with Dark Gradient Background */}
          <div className="relative h-64 rounded-xl overflow-hidden" style={{
            background: "linear-gradient(to bottom, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.02))"
          }}>
            {filteredChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredChartData}>
                  <defs>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.3}/>
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="label"
                    hide={true}
                  />
                  <YAxis
                    hide={true}
                    domain={[(dataMin: number) => dataMin * 0.999, (dataMax: number) => dataMax * 1.001]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #3f3f46",
                      borderRadius: "8px",
                      color: "#ffffff",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.5)"
                    }}
                    formatter={(value: any, name: string, props: any) => {
                      if (name === "price") {
                        const usdValue = props.payload.priceUSD;
                        return [
                          `$${usdValue.toFixed(8)}`,
                          "Price"
                        ];
                      }
                      return [value, name];
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="url(#lineGradient)"
                    strokeWidth={3}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      // Color dots based on transaction type: green for buy, red for sell
                      const fillColor = payload.type === "buy" ? "#10b981" : payload.type === "sell" ? "#ef4444" : "#10b981";
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill={fillColor}
                          stroke="#000"
                          strokeWidth={2}
                        />
                      );
                    }}
                    activeDot={{ r: 6, fill: "#10b981", strokeWidth: 2, stroke: "#000" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500">
                No price data available yet
              </div>
            )}
          </div>

          {/* Time Period Filters - Dark Theme */}
          <div className="mt-6 flex justify-center">
            <div className="flex gap-2">
              <button
                onClick={() => setChartPeriod("live")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  chartPeriod === "live"
                    ? "bg-emerald-500 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                LIVE
              </button>
              <button
                onClick={() => setChartPeriod("4h")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  chartPeriod === "4h"
                    ? "bg-emerald-500 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                4H
              </button>
              <button
                onClick={() => setChartPeriod("1d")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  chartPeriod === "1d"
                    ? "bg-emerald-500 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                1D
              </button>
              <button
                onClick={() => setChartPeriod("max")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                  chartPeriod === "max"
                    ? "bg-emerald-500 text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                MAX
              </button>
            </div>
          </div>
        </div>

        {/* Swap Interface */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
          {/* Buy/Sell Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSwapMode("buy")}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                swapMode === "buy"
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setSwapMode("sell")}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                swapMode === "sell"
                  ? "bg-red-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              Sell
            </button>
          </div>

          {/* Share Button */}
          <button
            onClick={copyShareUrl}
            className="w-full mb-6 py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share Token
              </>
            )}
          </button>

          {/* Input */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm text-zinc-400">
                USD Amount
              </label>
              {swapMode === "sell" && userTokenBalance > 0 && currentPrice && graduationTarget && curveState && (
                <button
                  onClick={() => {
                    // Calculate max sellable tokens:
                    // User can only sell the minimum of their balance or what the curve can buy back
                    const curveLiquidity = Number(curveState.tokensSold) / 1_000_000; // Convert from raw to display tokens
                    const maxSellableTokens = Math.min(userTokenBalance, curveLiquidity);

                    // Calculate USD value
                    const maxUSD = (maxSellableTokens * currentPrice * graduationTarget.solPriceUSD) / 1000;
                    setInputAmount(maxUSD.toFixed(2));
                  }}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition"
                >
                  MAX
                </button>
              )}
            </div>
            <input
              type="number"
              value={inputAmount}
              onChange={(e) => setInputAmount(e.target.value)}
              placeholder="0.0"
              step="0.01"
              min={graduationTarget ? (0.04 * graduationTarget.solPriceUSD).toFixed(2) : "0.04"}
              className={`w-full rounded-lg bg-zinc-900 border p-3 text-lg ${
                !isAmountValid && inputAmount ? "border-red-500" : "border-zinc-800"
              }`}
            />
            <p className={`text-xs mt-1 ${!isAmountValid && inputAmount ? "text-red-400" : "text-zinc-500"}`}>
              Minimum: {graduationTarget ? `$${(0.04 * graduationTarget.solPriceUSD).toFixed(2)}` : "$10"}
              {swapMode === "sell" && userTokenBalance > 0 && (
                <span className="ml-2 text-zinc-500">
                  • Balance: {userTokenBalance.toLocaleString()} {tokenData.symbol}
                </span>
              )}
            </p>
          </div>

          {/* Preview */}
          {swapPreview && (
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4 mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">You receive:</span>
                <span className="font-semibold text-emerald-400">
                  {swapMode === "buy"
                    ? `${formatTokenAmount((swapPreview as any).tokensReceived, 6)} ${
                        tokenData.symbol
                      }`
                    : graduationTarget
                      ? `$${(Number(lamportsToSol((swapPreview as any).solReceived)) * graduationTarget.solPriceUSD).toFixed(2)}`
                      : `${lamportsToSol((swapPreview as any).solReceived)} SOL`}
                </span>
              </div>
              <div className="border-t border-zinc-800 pt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Platform Fee (1%):</span>
                  <span className="text-zinc-400">
                    {graduationTarget
                      ? `$${(Number(lamportsToSol(swapPreview.platformFee)) * graduationTarget.solPriceUSD).toFixed(2)}`
                      : `${lamportsToSol(swapPreview.platformFee)} SOL`}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Creator Fee (1%):</span>
                  <span className="text-zinc-400">
                    {graduationTarget
                      ? `$${(Number(lamportsToSol(swapPreview.creatorFee)) * graduationTarget.solPriceUSD).toFixed(2)}`
                      : `${lamportsToSol(swapPreview.creatorFee)} SOL`}
                  </span>
                </div>
                <div className="flex justify-between text-xs pt-1 border-t border-zinc-800">
                  <span className="text-zinc-500">Total Fees (2%):</span>
                  <span className="text-zinc-400 font-semibold">
                    {graduationTarget
                      ? `$${(
                          (Number(lamportsToSol(swapPreview.platformFee)) +
                           Number(lamportsToSol(swapPreview.creatorFee))) *
                          graduationTarget.solPriceUSD
                        ).toFixed(2)}`
                      : `${(Number(lamportsToSol(swapPreview.platformFee)) + Number(lamportsToSol(swapPreview.creatorFee))).toFixed(6)} SOL`}
                  </span>
                </div>
              </div>
              <div className="flex justify-between pt-2 border-t border-zinc-800">
                <span className="text-zinc-400">Avg Price:</span>
                <span>
                  {graduationTarget
                    ? `$${((swapPreview.avgPrice / 1_000_000_000) * graduationTarget.solPriceUSD).toFixed(6)}`
                    : `${swapPreview.avgPrice.toFixed(9)} SOL`}
                </span>
              </div>
              <p className="text-xs text-zinc-500 pt-2 border-t border-zinc-800">
                💡 Trading fees (2% total) are deducted from your transaction. These fees support the platform and token creators.
              </p>
            </div>
          )}

          {/* Swap Button */}
          <button
            onClick={executeSwap}
            disabled={!connected || !swapPreview || !isAmountValid}
            className={`w-full rounded-lg disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-3 transition ${
              swapMode === "buy"
                ? "bg-violet-600 hover:bg-violet-700"
                : "bg-rose-500/60 hover:bg-rose-600/60"
            }`}
          >
            {!connected
              ? "Connect Wallet"
              : !isAmountValid && inputAmount
              ? `Amount Below Minimum (${graduationTarget ? `$${(0.04 * graduationTarget.solPriceUSD).toFixed(2)}` : "$10"})`
              : !swapPreview && inputAmount && swapMode === "sell"
              ? "Amount Exceeds Available Liquidity"
              : !swapPreview
              ? "Enter Amount"
              : swapMode === "buy"
              ? "Buy Tokens"
              : "Sell Tokens"}
          </button>

          {/* Transaction Processing Warning */}
          {status && (status.includes("Building") || status.includes("Requesting") ||
                     status.includes("Sending") || status.includes("Confirming") ||
                     status.includes("Checking")) && (
            <div className="mt-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 animate-pulse">
              <div className="flex items-center gap-2 justify-center">
                <svg className="animate-spin h-5 w-5 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-sm font-medium text-yellow-500">
                  ⏳ Hang tight! Transaction processing...
                </p>
              </div>
              <p className="text-xs text-zinc-400 text-center mt-2">
                Please don't close this window or refresh the page
              </p>
            </div>
          )}

          {/* Status */}
          {status && (
            <p className="mt-4 text-sm text-zinc-300 text-center">{status}</p>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="mt-6">
          <RecentTransactions
            ref={recentTransactionsRef}
            mintAddress={mint}
            solPriceUSD={graduationTarget?.solPriceUSD || 137.79}
          />
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-8 px-4 pb-24">
        <div className="max-w-2xl mx-auto">
          <p className="text-[11px] text-zinc-500 text-center leading-relaxed">
            Rocket-Mint.com is not an exchange and does not provide investment advice.
            The content of this app is not investment advice and does not constitute any
            offer or solicitation to offer or recommendation of any product or service. 
          </p>
          <p className="text-[11px] text-zinc-500 text-center leading-relaxed">
            Cryptocurrency memecoins are not assets and do not possess any intrinsic value or utility. They are for entertainment purposes only and should not be considered an investment, currency, or anything of value. The price of memecoins can be extremely volatile and unpredictable. Price data in the app my be inaccurate or delayed.
          </p>
          <p className="text-[11px] text-zinc-500 text-center leading-relaxed">
            Conversion between fiat and crypto currencies is provided by MoonPay, Inc. Cash balances are held in USDC, a fully collateralized stablecoin. All swap transactions are made on the blockchain using the self-custodial vallet connected to your account.  Rocket-Mint takes a fee each time you buy or sell a coin to cover platform cost that vary based on network congestioon and gas prices. Rocket-Mint is a visual interface to blockchain decenralized exchanges are does not directly exchange, develop, create, maintain, or endorse and cyptocurrencies.
          </p>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
