"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import { ArrowRight, Send, ArrowDownToLine } from "lucide-react";
import { APP_VERSION } from "@/lib/version";

type SolanaNetwork = "mainnet-beta" | "devnet" | "testnet";

// Platform fee wallet - receives 0.01% fee on all token transfers
const PLATFORM_FEE_WALLET = process.env.NEXT_PUBLIC_PLATFORM_TREASURY || "BnTkU7XxECmRoGwdrH8HFM9AXpoVvyuYZkz4yzfThPBp";
const PLATFORM_FEE_BPS = 1; // 0.01% = 1 basis point

type TokenHolding = {
  mintAddress: string;
  name: string;
  symbol: string;
  imageUrl: string | null;
  balance: number;
  valueUSD: number;
  changePercent: number;
  currentPrice: number;
  costBasis: number;
  gainLoss: number;
};

export default function HoldingsPage() {
  const { connected, publicKey } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [holdings, setHoldings] = useState<TokenHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [solBalance, setSolBalance] = useState(0);
  const [totalValueUSD, setTotalValueUSD] = useState(0);
  const [totalCreatedTokensValueUSD, setTotalCreatedTokensValueUSD] = useState(0);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenHolding | null>(null);
  const [recipientAddress, setRecipientAddress] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendAmountUSD, setSendAmountUSD] = useState("");
  const [useUSDInput, setUseUSDInput] = useState(true); // Default to USD input
  const [sendingToken, setSendingToken] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showAvatarUpload, setShowAvatarUpload] = useState(false);
  const [solPriceUsd, setSolPriceUsd] = useState<number | null>(null);
  const depositMethod = "crypto"; // Always use crypto for deposits

  const network: SolanaNetwork =
    (process.env.NEXT_PUBLIC_SOLANA_NETWORK as SolanaNetwork) || "devnet";

  const connection = useMemo(() => {
    const endpoint =
      network === "devnet"
        ? "https://solana-devnet.g.alchemy.com/v2/RVeMfinzUHGfNq_Alf3VR"
        : "https://solana-mainnet.g.alchemy.com/v2/RVeMfinzUHGfNq_Alf3VR";
    return new Connection(endpoint, "confirmed");
  }, [network]);

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

  const requestAirdrop = useCallback(async () => {
    try {
      if (!publicKey) return;
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
        alert("✅ Airdrop complete! Check your wallet balance.");
      } catch (confirmError) {
        // Check signature status if confirmation times out
        const signatureStatus = await connection.getSignatureStatus(sig);
        if (signatureStatus?.value?.confirmationStatus === "confirmed" ||
            signatureStatus?.value?.confirmationStatus === "finalized") {
          alert("✅ Airdrop complete! Check your wallet balance.");
        } else {
          alert(`⏳ Airdrop submitted!\n\nThe transaction is processing. Check Solana Explorer:\nhttps://explorer.solana.com/tx/${sig}?cluster=${network}`);
        }
      }
    } catch (e: any) {
      alert(`❌ Airdrop failed: ${e?.message || String(e)}`);
    }
  }, [connection, publicKey, network]);

  const handleSendToken = async () => {
    if (!selectedToken || !recipientAddress || !publicKey) {
      alert("Please fill in all fields");
      return;
    }

    // Get the actual token amount to send
    let tokenAmountToSend: number;
    if (useUSDInput) {
      if (!sendAmountUSD) {
        alert("Please enter an amount");
        return;
      }
      // Convert USD to token amount using current price
      const usdAmount = parseFloat(sendAmountUSD);
      if (selectedToken.currentPrice <= 0) {
        alert("❌ Cannot calculate token amount - invalid price");
        return;
      }
      tokenAmountToSend = usdAmount / selectedToken.currentPrice;
    } else {
      if (!sendAmount) {
        alert("Please enter an amount");
        return;
      }
      tokenAmountToSend = parseFloat(sendAmount);
    }

    if (tokenAmountToSend <= 0 || isNaN(tokenAmountToSend)) {
      alert("❌ Invalid amount");
      return;
    }

    if (tokenAmountToSend > selectedToken.balance) {
      alert("❌ Insufficient balance");
      return;
    }

    try {
      setSendingToken(true);

      // Validate recipient address
      let recipientPubkey: PublicKey;
      try {
        recipientPubkey = new PublicKey(recipientAddress);
      } catch {
        alert("❌ Invalid recipient address");
        setSendingToken(false);
        return;
      }

      // Get sender and recipient token accounts
      const mintPubkey = new PublicKey(selectedToken.mintAddress);
      const senderAta = getAssociatedTokenAddressSync(
        mintPubkey,
        publicKey,
        false,
        TOKEN_PROGRAM_ID
      );

      const recipientAta = getAssociatedTokenAddressSync(
        mintPubkey,
        recipientPubkey,
        false,
        TOKEN_PROGRAM_ID
      );

      // Calculate platform fee (0.01% of transfer amount)
      const totalAmountInSmallestUnit = Math.floor(tokenAmountToSend * 1_000_000); // 6 decimals
      const feeAmount = Math.floor(totalAmountInSmallestUnit * PLATFORM_FEE_BPS / 10000);
      const recipientAmount = totalAmountInSmallestUnit - feeAmount;

      // Check if recipient token account exists
      const recipientAccountInfo = await connection.getAccountInfo(recipientAta);

      // Get platform fee wallet token account
      const platformFeePubkey = new PublicKey(PLATFORM_FEE_WALLET);
      const platformFeeAta = getAssociatedTokenAddressSync(
        mintPubkey,
        platformFeePubkey,
        false,
        TOKEN_PROGRAM_ID
      );
      const platformFeeAccountInfo = await connection.getAccountInfo(platformFeeAta);

      const tx = new Transaction();
      const { createAssociatedTokenAccountInstruction, createTransferInstruction } = await import("@solana/spl-token");

      // If recipient account doesn't exist, create it first
      if (!recipientAccountInfo) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            publicKey, // payer
            recipientAta,
            recipientPubkey,
            mintPubkey,
            TOKEN_PROGRAM_ID
          )
        );
      }

      // If platform fee account doesn't exist, create it first
      if (!platformFeeAccountInfo) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            publicKey, // payer
            platformFeeAta,
            platformFeePubkey,
            mintPubkey,
            TOKEN_PROGRAM_ID
          )
        );
      }

      // Add transfer to recipient (amount minus fee)
      tx.add(
        createTransferInstruction(
          senderAta,
          recipientAta,
          publicKey,
          recipientAmount,
          [],
          TOKEN_PROGRAM_ID
        )
      );

      // Add transfer to platform fee wallet (fee)
      if (feeAmount > 0) {
        tx.add(
          createTransferInstruction(
            senderAta,
            platformFeeAta,
            publicKey,
            feeAmount,
            [],
            TOKEN_PROGRAM_ID
          )
        );
      }

      // Send transaction using wallet adapter
      // Get the wallet's sendTransaction method
      const wallet = (window as any).solana;
      if (!wallet) {
        alert("❌ Wallet not found");
        setSendingToken(false);
        return;
      }

      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signed = await wallet.signAndSendTransaction(tx);
      const signature = signed.signature;

      // Use a more robust confirmation with timeout handling
      try {
        // Try to confirm with 60 second timeout
        const { blockhash: latestBlockhash } = await connection.getLatestBlockhash();
        await connection.confirmTransaction(
          {
            signature,
            blockhash: latestBlockhash,
            lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight,
          },
          "confirmed"
        );
      } catch (confirmError: any) {
        // If confirmation times out, check signature status directly
        console.log("Confirmation timeout, checking signature status...", confirmError);
        const signatureStatus = await connection.getSignatureStatus(signature);

        if (signatureStatus?.value?.confirmationStatus === "confirmed" ||
            signatureStatus?.value?.confirmationStatus === "finalized") {
          console.log("Transaction confirmed via signature status check");
        } else if (signatureStatus?.value?.err) {
          // Transaction actually failed
          throw new Error(`Transaction failed: ${JSON.stringify(signatureStatus.value.err)}`);
        } else {
          // Still pending, but signature was sent
          alert(`⏳ Transaction submitted!\n\nSignature: ${signature.slice(0, 8)}...${signature.slice(-8)}\n\nThe transaction is processing on-chain. Check Solana Explorer to verify:\n\nhttps://explorer.solana.com/tx/${signature}${network === "devnet" ? "?cluster=devnet" : ""}`);
          setShowSendModal(false);
          setSelectedToken(null);
          setRecipientAddress("");
          setSendAmount("");
          setSendAmountUSD("");
          setSendingToken(false);
          return;
        }
      }

      const usdValue = tokenAmountToSend * selectedToken.currentPrice;
      const feeTokens = feeAmount / 1_000_000;
      const recipientTokens = recipientAmount / 1_000_000;
      const feeUSD = feeTokens * selectedToken.currentPrice;

      const explorerUrl = `https://explorer.solana.com/tx/${signature}${network === "devnet" ? "?cluster=devnet" : ""}`;

      alert(`✅ Transfer Complete!\n\nRecipient received: ${recipientTokens.toFixed(6)} ${selectedToken.symbol}\nPlatform fee (0.01%): ${feeTokens.toFixed(6)} ${selectedToken.symbol} ($${feeUSD.toFixed(4)})\nTotal sent: ${tokenAmountToSend.toFixed(6)} ${selectedToken.symbol} ($${usdValue.toFixed(2)})\n\nTo: ${recipientAddress.slice(0, 4)}...${recipientAddress.slice(-4)}\n\nView on Solana Explorer:\n${explorerUrl}`);

      // Reset form and close modal
      setShowSendModal(false);
      setSelectedToken(null);
      setRecipientAddress("");
      setSendAmount("");
      setSendAmountUSD("");

      // Refresh holdings
      const res = await fetch(`/api/user-holdings?wallet=${publicKey.toBase58()}`);
      const data = await res.json();
      if (res.ok) {
        setHoldings(data.holdings || []);
        setTotalValueUSD(data.totalValueUSD || 0);
      }
    } catch (err: any) {
      console.error("Send error:", err);
      alert(`❌ Send failed: ${err?.message || String(err)}`);
    } finally {
      setSendingToken(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load avatar from localStorage on mount
  useEffect(() => {
    if (publicKey) {
      const savedAvatar = localStorage.getItem(`avatar_${publicKey.toBase58()}`);
      if (savedAvatar) {
        setAvatarUrl(savedAvatar);
      }
    }
  }, [publicKey]);

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
    // Refresh price every 60 seconds
    const interval = setInterval(fetchSolPrice, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("❌ Image must be less than 5MB");
      return;
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      alert("❌ Please select an image file");
      return;
    }

    // Convert to base64 and save
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setAvatarUrl(base64String);
      if (publicKey) {
        localStorage.setItem(`avatar_${publicKey.toBase58()}`, base64String);
      }
      setShowAvatarUpload(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl(null);
    if (publicKey) {
      localStorage.removeItem(`avatar_${publicKey.toBase58()}`);
    }
    setShowAvatarUpload(false);
  };

  // Fetch user's token holdings
  useEffect(() => {
    if (!connected || !publicKey) {
      setHoldings([]);
      setSolBalance(0);
      setTotalValueUSD(0);
      setLoading(false);
      return;
    }

    let isFirstLoad = true;

    const fetchHoldings = async () => {
      try {
        // Only show loading spinner on first load
        if (isFirstLoad) {
          setLoading(true);
        }

        // Fetch SOL balance
        const balance = await connection.getBalance(publicKey);
        setSolBalance(balance / LAMPORTS_PER_SOL);

        // Fetch user's token holdings from your API
        const res = await fetch(`/api/user-holdings?wallet=${publicKey.toBase58()}`);
        const data = await res.json();

        if (res.ok) {
          setHoldings(data.holdings || []);
          setTotalValueUSD(data.totalValueUSD || 0);
          setTotalCreatedTokensValueUSD(data.totalCreatedTokensValueUSD || 0);
        }
      } catch (err) {
        console.error("Error fetching holdings:", err);
      } finally {
        if (isFirstLoad) {
          setLoading(false);
          isFirstLoad = false;
        }
      }
    };

    fetchHoldings();

    // Refresh holdings every 30 seconds (silent background refresh)
    const interval = setInterval(fetchHoldings, 30000);
    return () => clearInterval(interval);
  }, [connected, publicKey]);

  if (!mounted) return null;

  if (!connected) {
    return (
      <main className="min-h-screen bg-linear-to-b from-black to-zinc-900 text-white flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="mb-6 flex justify-center">
              <div className="w-20 h-20 rounded-full bg-violet-600/20 flex items-center justify-center">
                <svg className="w-10 h-10 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-2">Connect Your Wallet</h1>
            <p className="text-zinc-400 mb-6">
              Connect your wallet to view your token holdings
            </p>
            <WalletMultiButton />
          </div>
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-linear-to-b from-black to-zinc-900 text-white flex flex-col pb-20 overflow-x-hidden">
      {/* Header */}
      <header className="px-6 py-6 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Rocket Mint Logo"
              className="w-10 h-10 md:w-12 md:h-12"
            />
            <h1 className="text-xl font-bold">Holdings</h1>
          </div>
          <WalletMultiButton />
        </div>
      </header>

      {/* Profile Section */}
      <section className="px-6 py-8 text-center border-b border-zinc-800">
        <div className="mb-4 flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-linear-to-br from-violet-600 to-purple-600 flex items-center justify-center text-2xl font-bold overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{publicKey?.toBase58().slice(0, 2).toUpperCase() || "??"}</span>
              )}
            </div>
            <button
              onClick={() => setShowAvatarUpload(true)}
              className="absolute bottom-0 right-0 w-8 h-8 bg-violet-600 hover:bg-violet-700 rounded-full flex items-center justify-center border-2 border-zinc-900 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
        </div>
        <p className="text-sm text-zinc-400 mb-2 truncate max-w-full">
          {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
        </p>

        {/* Total Value Display */}
        <div className="mb-6">
          <p className="text-xs text-zinc-500 mb-1">Total in Rocket-Mint</p>
          <p className="text-3xl font-bold">
            ${totalValueUSD != null && !isNaN(totalValueUSD) ? totalValueUSD.toFixed(2) : "0.00"}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-8 mt-8">
          <button
            onClick={() => setShowDepositModal(true)}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-700 transition flex items-center justify-center">
              <ArrowDownToLine className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium">Deposit</span>
          </button>
          <button
            onClick={() => setShowSendModal(true)}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-700 transition flex items-center justify-center">
              <Send className="w-6 h-6" />
            </div>
            <span className="text-sm font-medium">Send</span>
          </button>
        </div>

        {/* Version and Contact Info */}
        <div className="mt-6 pt-4 border-t border-zinc-800/50">
          <div className="text-center space-y-1">
            <div className="text-[10px] text-zinc-600">
              Rocket-Mint v{APP_VERSION} © 2025
            </div>
            <a
              href="mailto:info@rocket-mint.com"
              className="text-[10px] text-zinc-500 hover:text-violet-400 transition block"
            >
              info@rocket-mint.com
            </a>
            {/*<a
              href="https://discord.gg/FY3Mc5dB"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-zinc-500 hover:text-violet-400 transition block"
            >
              Join our Discord
            </a>*/}
          </div>
        </div>
      </section>

      {/* Cash Section */}
      <section className="px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">SOL Balance</h3>
            <p className="text-2xl font-bold text-emerald-400">{solBalance.toFixed(4)} SOL</p>
            {solBalance > 0 && solPriceUsd !== null && (
              <p className="text-base text-zinc-400 mt-1">
                ≈ ${(solBalance * solPriceUsd).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} USD
              </p>
            )}
          </div>
          <button
            onClick={() => setShowDepositModal(true)}
            className="w-12 h-12 rounded-full bg-violet-600 hover:bg-violet-700 transition flex items-center justify-center"
          >
            <span className="text-2xl">+</span>
          </button>
        </div>
      </section>

      {/* Holdings List */}
      <section className="flex-1 px-6 py-4">
        <div className="mb-3">
          <h3 className="text-lg font-semibold">Rocket-Mint Tokens</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
          </div>
        ) : holdings.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-4 flex justify-center">
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
                <svg className="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
            </div>
            <p className="text-zinc-400 mb-4">No tokens yet</p>
            <Link
              href="/"
              className="inline-block px-6 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg font-medium transition"
            >
              Discover Tokens
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {holdings.map((token) => {
              const isPositive = token.changePercent >= 0;
              return (
                <Link
                  key={token.mintAddress}
                  href={`/swap/${token.mintAddress}`}
                  className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-violet-600 transition"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-linear-to-br from-violet-600 to-purple-600 flex items-center justify-center overflow-hidden shrink-0">
                    {token.imageUrl ? (
                      <img src={token.imageUrl} alt={token.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-base sm:text-lg font-bold">{token.symbol.slice(0, 2)}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm sm:text-base font-semibold truncate">{token.name}</h4>
                    <p className="text-xs sm:text-sm text-zinc-400 truncate">
                      {token.balance.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4,
                      })}{" "}
                      {token.symbol}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm sm:text-base font-semibold whitespace-nowrap">
                      ${token.valueUSD != null && !isNaN(token.valueUSD) ? token.valueUSD.toFixed(2) : "0.00"}
                    </p>
                    {token.costBasis > 0 && (
                      <>
                        <p className={`text-xs sm:text-sm font-semibold whitespace-nowrap ${isPositive ? "text-emerald-500" : "text-red-500"}`}>
                          {isPositive ? "+" : ""}${Math.abs(token.gainLoss || 0).toFixed(2)} {isPositive ? "▲" : "▼"}
                        </p>
                        <p className="text-[10px] sm:text-xs text-zinc-500 whitespace-nowrap">
                          {Math.abs(token.changePercent).toFixed(1)}%
                        </p>
                      </>
                    )}
                    {token.costBasis === 0 && (
                      <p className="text-xs text-zinc-500">No purchase history</p>
                    )}
                  </div>

                  <ArrowRight className="w-5 h-5 text-violet-500 shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Deposit Modal */}
      {showDepositModal && connected && publicKey && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 max-w-md w-full p-4 sm:p-6 relative max-h-[90vh] overflow-y-auto my-auto overflow-x-hidden">
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

            {/* Devnet Faucets */}
            {network === "devnet" && (
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

            {/* Warning */}
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3">
              <p className="text-xs text-red-400">
                ⚠️ Only send SOL on the <strong>{network}</strong> network. Sending to the wrong network will result in loss of funds.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Upload Modal */}
      {showAvatarUpload && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 max-w-sm w-full p-4 sm:p-6 relative overflow-x-hidden">
            {/* Close Button */}
            <button
              onClick={() => setShowAvatarUpload(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-2">Change Avatar</h2>
              <p className="text-sm text-zinc-400">
                Upload a profile picture
              </p>
            </div>

            {/* Current Avatar Preview */}
            {avatarUrl && (
              <div className="mb-6 flex justify-center">
                <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-zinc-800">
                  <img src={avatarUrl} alt="Current avatar" className="w-full h-full object-cover" />
                </div>
              </div>
            )}

            {/* Upload Button */}
            <label className="block w-full mb-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <div className="w-full py-3 bg-violet-600 hover:bg-violet-700 rounded-lg font-semibold text-center cursor-pointer transition">
                {avatarUrl ? "Change Avatar" : "Upload Avatar"}
              </div>
            </label>

            {/* Remove Button */}
            {avatarUrl && (
              <button
                onClick={handleRemoveAvatar}
                className="w-full py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg font-semibold transition"
              >
                Remove Avatar
              </button>
            )}

            {/* Info */}
            <div className="mt-4 rounded-lg bg-blue-500/10 border border-blue-500/30 p-3">
              <p className="text-xs text-blue-400">
                💡 Supported formats: JPG, PNG, GIF. Max size: 5MB
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Send Modal */}
      {showSendModal && connected && publicKey && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-linear-to-br from-zinc-900 via-violet-950/30 to-zinc-900 rounded-2xl border border-violet-600/30 max-w-md w-full p-4 sm:p-6 relative max-h-[90vh] overflow-y-auto overflow-x-hidden my-auto shadow-2xl shadow-violet-600/10">
            {/* Close Button */}
            <button
              onClick={() => {
                setShowSendModal(false);
                setSelectedToken(null);
                setRecipientAddress("");
                setSendAmount("");
                setSendAmountUSD("");
              }}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <img
                  src="/logo.png"
                  alt="Rocket Mint Logo"
                  className="w-10 h-10"
                />
                <h2 className="text-2xl font-bold">Send Tokens</h2>
              </div>
              <p className="text-sm text-zinc-400">
                Transfer tokens to another wallet
              </p>
            </div>

            {/* Token Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Select Token</label>
              <select
                value={selectedToken?.mintAddress || ""}
                onChange={(e) => {
                  const token = holdings.find((h) => h.mintAddress === e.target.value);
                  setSelectedToken(token || null);
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-600"
              >
                <option value="">Choose a token...</option>
                {holdings.map((token) => (
                  <option key={token.mintAddress} value={token.mintAddress}>
                    {token.name} ({token.symbol}) - Balance: {token.balance.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            {/* Recipient Address */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Recipient Address</label>
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="Enter Solana wallet address"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-600"
              />
            </div>

            {/* Amount */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Amount</label>
                <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg p-1">
                  <button
                    onClick={() => setUseUSDInput(true)}
                    className={`px-3 py-1 rounded text-xs font-medium transition ${
                      useUSDInput
                        ? "bg-violet-600 text-white"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    USD
                  </button>
                  <button
                    onClick={() => setUseUSDInput(false)}
                    className={`px-3 py-1 rounded text-xs font-medium transition ${
                      !useUSDInput
                        ? "bg-violet-600 text-white"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Token
                  </button>
                </div>
              </div>
              <div className="relative">
                {useUSDInput ? (
                  <>
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                    <input
                      type="number"
                      value={sendAmountUSD}
                      onChange={(e) => setSendAmountUSD(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-7 pr-20 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-600"
                    />
                    {selectedToken && (
                      <button
                        type="button"
                        onClick={() => {
                          const maxUSD = selectedToken.balance * selectedToken.currentPrice;
                          setSendAmountUSD(maxUSD.toFixed(2));
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded font-bold transition z-10"
                      >
                        MAX
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <input
                      type="number"
                      value={sendAmount}
                      onChange={(e) => setSendAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.000001"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 pr-16 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-600"
                    />
                    {selectedToken && (
                      <button
                        onClick={() => setSendAmount(selectedToken.balance.toString())}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-violet-600 hover:bg-violet-700 text-white px-2 py-1 rounded font-medium transition"
                      >
                        MAX
                      </button>
                    )}
                  </>
                )}
              </div>
              {selectedToken && (
                <div className="text-xs text-zinc-500 mt-1 space-y-0.5">
                  <p>Available: {selectedToken.balance.toFixed(6)} {selectedToken.symbol}</p>
                  {useUSDInput && sendAmountUSD && (
                    <p className="text-violet-400">
                      ≈ {(parseFloat(sendAmountUSD) / selectedToken.currentPrice).toFixed(6)} {selectedToken.symbol}
                    </p>
                  )}
                  {!useUSDInput && sendAmount && (
                    <p className="text-violet-400">
                      ≈ ${(parseFloat(sendAmount) * selectedToken.currentPrice).toFixed(2)} USD
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Fee Breakdown */}
            {selectedToken && (useUSDInput ? sendAmountUSD : sendAmount) && (
              <div className="mb-6 rounded-lg bg-violet-500/10 border border-violet-500/30 p-4">
                <h3 className="text-xs font-semibold text-violet-400 mb-2">
                  Transaction Breakdown
                </h3>
                <div className="space-y-2 text-xs">
                  {(() => {
                    const tokenAmount = useUSDInput
                      ? parseFloat(sendAmountUSD) / selectedToken.currentPrice
                      : parseFloat(sendAmount);
                    const totalUSD = tokenAmount * selectedToken.currentPrice;
                    const fee = tokenAmount * 0.0001; // 0.01%
                    const feeUSD = fee * selectedToken.currentPrice;
                    const recipientGets = tokenAmount - fee;
                    const recipientGetsUSD = recipientGets * selectedToken.currentPrice;

                    return (
                      <>
                        <div className="flex justify-between items-start text-zinc-300">
                          <span>Total Amount:</span>
                          <div className="text-right">
                            <div className="font-bold text-white">${totalUSD.toFixed(2)}</div>
                            <div className="text-zinc-500">{tokenAmount.toFixed(6)} {selectedToken.symbol}</div>
                          </div>
                        </div>
                        <div className="flex justify-between items-start text-zinc-400">
                          <span>Platform Fee (0.01%):</span>
                          <div className="text-right">
                            <div className="font-medium text-orange-400">-${feeUSD.toFixed(4)}</div>
                            <div className="text-zinc-500">-{fee.toFixed(6)} {selectedToken.symbol}</div>
                          </div>
                        </div>
                        <div className="flex justify-between items-start text-emerald-400 font-semibold pt-2 border-t border-violet-500/30">
                          <span>Recipient Receives:</span>
                          <div className="text-right">
                            <div className="font-bold text-emerald-400">${recipientGetsUSD.toFixed(2)}</div>
                            <div className="text-emerald-500/70">{recipientGets.toFixed(6)} {selectedToken.symbol}</div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Send Button */}
            <button
              onClick={handleSendToken}
              disabled={
                !selectedToken ||
                !recipientAddress ||
                (useUSDInput ? !sendAmountUSD : !sendAmount) ||
                sendingToken
              }
              className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed rounded-lg font-semibold transition"
            >
              {sendingToken ? "Sending..." : "Send Tokens"}
            </button>

            {/* Warning */}
            <div className="mt-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3">
              <p className="text-xs text-yellow-400">
                ⚠️ Double-check the recipient address. Transactions cannot be reversed.
              </p>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
