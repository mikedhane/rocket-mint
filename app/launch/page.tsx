"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  ChangeEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  AuthorityType,
  MINT_SIZE,
} from "@solana/spl-token";
import {
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID as METADATA_PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";

import {
  uploadImageToServer,
  uploadMetadataToServer,
} from "@/lib/firebaseUpload";
import BottomNav from "@/components/BottomNav";

type SolanaNetwork = "devnet" | "mainnet-beta" | "testnet";

type LaunchForm = {
  name: string;
  symbol: string;
  description: string;
  liquidityFundingSol: string;
  liquidityWallet: string;
  website: string;
  twitter: string;
};

const PLATFORM_TREASURY = process.env.NEXT_PUBLIC_PLATFORM_TREASURY || "";
const PLATFORM_CREATION_FEE_SOL = Number(
  process.env.NEXT_PUBLIC_PLATFORM_CREATION_FEE_SOL || 0
); // e.g. 0.1 = 0.1 SOL per token creation

/** Safely convert a decimal string (e.g., "1.25") to base units (BigInt). */
function toBaseUnits(amountStr: string, decimals: number): bigint {
  const [intPartRaw, fracPartRaw = ""] = String(amountStr).trim().split(".");
  const intPart = intPartRaw || "0";

  if (!/^\d+$/.test(intPart) || !/^\d*$/.test(fracPartRaw)) {
    throw new Error("Invalid number");
  }

  const fracPart = fracPartRaw.padEnd(decimals, "0").slice(0, decimals);
  const whole = BigInt(intPart);
  const frac = BigInt(fracPart || "0");
  return whole * BigInt(10) ** BigInt(decimals) + frac;
}

export default function LaunchPage() {
  const router = useRouter();
  const { connected, publicKey, signTransaction } = useWallet();

  // avoid hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [form, setForm] = useState<LaunchForm>({
    name: "",
    symbol: "",
    description: "",
    liquidityFundingSol: "20", // Default to minimum required
    liquidityWallet: "",
    website: "",
    twitter: "",
  });

  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [mintAddress, setMintAddress] = useState<string>("");
  const [solBalance, setSolBalance] = useState<number>(0);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [depositMethod, setDepositMethod] = useState<"crypto" | "card">("crypto");
  const [solPriceUSD, setSolPriceUSD] = useState<number>(100); // Default fallback
  const [showComingSoon, setShowComingSoon] = useState(false);

  const network: SolanaNetwork =
    (process.env.NEXT_PUBLIC_SOLANA_NETWORK as SolanaNetwork) || "devnet";

  // Calculate total cost in SOL
  const totalCostInSol = useMemo(() => {
    const liquidityUSD = Number(form.liquidityFundingSol || "0");
    const liquidityInSol = solPriceUSD > 0 ? liquidityUSD / solPriceUSD : 0;
    const networkFees = 0.015; // Estimated network fees
    return PLATFORM_CREATION_FEE_SOL + networkFees + liquidityInSol;
  }, [form.liquidityFundingSol, solPriceUSD]);

  // Minimum required balance
  const minRequiredBalance = Math.max(totalCostInSol, 0.25);

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

  // Set liquidity wallet to user's connected wallet address
  useEffect(() => {
    if (connected && publicKey) {
      setForm((prev) => ({
        ...prev,
        liquidityWallet: publicKey.toBase58(),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        liquidityWallet: "",
      }));
    }
  }, [connected, publicKey]);

  // Fetch user's SOL balance when wallet connects
  useEffect(() => {
    if (!connected || !publicKey) {
      setSolBalance(0);
      return;
    }

    const fetchBalance = async () => {
      try {
        const balance = await connection.getBalance(publicKey);
        setSolBalance(balance / LAMPORTS_PER_SOL);
      } catch (err) {
        console.error("Failed to fetch SOL balance:", err);
        setSolBalance(0);
      }
    };

    fetchBalance();

    // Refresh balance every 10 seconds while connected
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [connected, publicKey, connection]);

  const onChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((s) => ({
      ...s,
      [name]: value,
    }));
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    handleFileSelect(f);
  };

  const handleFileSelect = (f: File | null) => {
    setFile(f);

    // Clean up old preview URL if it exists
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    // Create preview URL for new file
    if (f) {
      const previewUrl = URL.createObjectURL(f);
      setImagePreview(previewUrl);
    } else {
      setImagePreview("");
    }
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      handleFileSelect(droppedFile);
    }
  };

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

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const launch = useCallback(
    async () => {
      try {
        if (!mounted) return;
        if (!connected || !publicKey || !signTransaction) {
          throw new Error("Connect a wallet first.");
        }
        if (!PLATFORM_TREASURY) {
          throw new Error("NEXT_PUBLIC_PLATFORM_TREASURY is not set.");
        }
        if (!form.name || !form.symbol) {
          throw new Error("Enter a token name and symbol.");
        }
        if (!file) {
          throw new Error("Please upload a meme image for your token.");
        }

        // Validate minimum liquidity funding of $20
        const liquidityUSD = Number(form.liquidityFundingSol || "0");
        if (liquidityUSD < 20) {
          throw new Error("Minimum liquidity funding is $20 USD.");
        }

        // Convert USD to SOL for liquidity funding
        const liquiditySol = liquidityUSD / solPriceUSD;

        setStatus("Processing...");

        // 1) Upload image via API route
        const imageUrl = await uploadImageToServer(file);

        // 2) Build metadata JSON + upload to Firebase
        const metadataJson = {
          name: form.name,
          symbol: form.symbol,
          description: form.description,
          image: imageUrl,
          tags: ["memecoin"],
        };

        let safeName = form.symbol?.trim().toLowerCase() ?? "";
        safeName = safeName.replace(/[^a-z0-9]/gi, "-");
        if (!safeName || safeName.startsWith("-")) safeName = "memecoin";

        const metadataUri = await uploadMetadataToServer(
          metadataJson,
          `${safeName}-metadata.json`
        );

        // 3) Build classic SPL token mint with Metaplex metadata
        const payer = publicKey as PublicKey;
        const mint = Keypair.generate();

        const lamports = await connection.getMinimumBalanceForRentExemption(
          MINT_SIZE
        );

        const createMintIx = SystemProgram.createAccount({
          fromPubkey: payer,
          newAccountPubkey: mint.publicKey,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        });

        // Fixed values: 1B tokens with 6 decimals, 1% to creator, 99% to bonding curve
        const decimals = 6;
        const initialSupply = "1000000000"; // 1 billion
        const creatorPercent = 1; // 1% to creator

        const initMintIx = createInitializeMint2Instruction(
          mint.publicKey,
          decimals,
          payer,
          payer,
          TOKEN_PROGRAM_ID
        );

        // Create reserve wallet for bonding curve
        const reserveWallet = Keypair.generate();

        // Calculate token allocation: 1% to creator, 99% to bonding curve
        const baseUnits = toBaseUnits(initialSupply, decimals);
        const creatorAmount = (baseUnits * BigInt(creatorPercent)) / BigInt(100);
        const reserveAmount = baseUnits - creatorAmount;

        // Creator ATA
        const creatorAta = getAssociatedTokenAddressSync(
          mint.publicKey,
          payer,
          false,
          TOKEN_PROGRAM_ID
        );

        const createCreatorAtaIx = createAssociatedTokenAccountInstruction(
          payer,
          creatorAta,
          payer,
          mint.publicKey,
          TOKEN_PROGRAM_ID
        );

        // Reserve ATA
        const reserveAta = getAssociatedTokenAddressSync(
          mint.publicKey,
          reserveWallet.publicKey,
          false,
          TOKEN_PROGRAM_ID
        );

        const createReserveAtaIx = createAssociatedTokenAccountInstruction(
          payer, // payer for the account creation
          reserveAta,
          reserveWallet.publicKey, // owner
          mint.publicKey,
          TOKEN_PROGRAM_ID
        );

        // Mint tokens to creator
        const mintToCreatorIx = createMintToInstruction(
          mint.publicKey,
          creatorAta,
          payer,
          creatorAmount,
          [],
          TOKEN_PROGRAM_ID
        );

        // Mint tokens to reserve (bonding curve)
        const mintToReserveIx = createMintToInstruction(
          mint.publicKey,
          reserveAta,
          payer,
          reserveAmount,
          [],
          TOKEN_PROGRAM_ID
        );

        // CRITICAL: Revoke mint authority to prevent any future minting
        // This ensures the total supply is permanently fixed at 1 billion tokens
        const revokeMintAuthorityIx = createSetAuthorityInstruction(
          mint.publicKey,
          payer,
          AuthorityType.MintTokens,
          null,
          [],
          TOKEN_PROGRAM_ID
        );

        // CRITICAL: Revoke freeze authority to prevent freezing token accounts
        // This ensures tokens can always be traded freely
        const revokeFreezeAuthorityIx = createSetAuthorityInstruction(
          mint.publicKey,
          payer,
          AuthorityType.FreezeAccount,
          null,
          [],
          TOKEN_PROGRAM_ID
        );

        // Create Metaplex metadata PDA
        const [metadataPDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("metadata"),
            METADATA_PROGRAM_ID.toBuffer(),
            mint.publicKey.toBuffer(),
          ],
          METADATA_PROGRAM_ID
        );

        const createMetadataIx = createCreateMetadataAccountV3Instruction(
          {
            metadata: metadataPDA,
            mint: mint.publicKey,
            mintAuthority: payer,
            payer: payer,
            updateAuthority: payer,
          },
          {
            createMetadataAccountArgsV3: {
              data: {
                name: form.name,
                symbol: form.symbol,
                uri: metadataUri,
                sellerFeeBasisPoints: 0,
                creators: null,
                collection: null,
                uses: null,
              },
              isMutable: true,
              collectionDetails: null,
            },
          }
        );

        // ====================================================================
        // TRANSACTION 1: Create Mint Account (Simplest - just the mint)
        // Split into 3 transactions to help Phantom simulate each one properly
        // ====================================================================
        setStatus("📋 Step 1/3: Creating mint account...");

        const tx1 = new Transaction();

        // Minimal compute budget for transaction 1 (just mint creation)
        tx1.add(
          ComputeBudgetProgram.setComputeUnitLimit({
            units: 100_000, // Minimal for just creating mint
          })
        );

        tx1.add(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: 1000, // Priority fee
          })
        );

        // Only create and initialize the mint account
        tx1.add(
          createMintIx,
          initMintIx
        );

        tx1.feePayer = payer;
        const { blockhash: blockhash1, lastValidBlockHeight: lastValidBlockHeight1 } =
          await connection.getLatestBlockhash();
        tx1.recentBlockhash = blockhash1;

        setStatus("🔐 Awaiting signature for mint creation...");
        // Phantom wallet signs first (per Phantom security guidelines)
        let signed1 = await signTransaction(tx1);

        // Additional signers sign afterward
        signed1.partialSign(mint);

        setStatus("📤 Sending transaction 1/3...");
        const sig1 = await connection.sendRawTransaction(signed1.serialize(), {
          skipPreflight: false,
          maxRetries: 3,
        });

        setStatus("⏳ Confirming transaction 1/3...");
        try {
          const confirmation1 = await connection.confirmTransaction({
            signature: sig1,
            blockhash: blockhash1,
            lastValidBlockHeight: lastValidBlockHeight1,
          }, "confirmed");

          if (confirmation1.value.err) {
            throw new Error(`Transaction 1 failed: ${JSON.stringify(confirmation1.value.err)}`);
          }
        } catch (confirmErr: any) {
          console.error("Confirmation error:", confirmErr);
          const status = await connection.getSignatureStatus(sig1);
          if (status?.value?.err) {
            throw new Error(`Transaction 1 failed: ${JSON.stringify(status.value.err)}`);
          }
          if (!(status?.value?.confirmationStatus === "confirmed" ||
                status?.value?.confirmationStatus === "finalized")) {
            throw new Error(`Transaction 1 not confirmed. Signature: ${sig1}`);
          }
        }

        setStatus("✅ Mint created! Now distributing tokens...");

        // ====================================================================
        // TRANSACTION 2: Distribute Tokens & Fees
        // Create ATAs, mint tokens, and handle all transfers
        // ====================================================================
        setStatus("📋 Step 2/3: Distributing tokens and processing fees...");

        const tx2 = new Transaction();

        // Add compute budget for transaction 2 (token distribution)
        tx2.add(
          ComputeBudgetProgram.setComputeUnitLimit({
            units: 250_000, // Sufficient for ATAs + minting + transfers
          })
        );

        tx2.add(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: 1000, // Priority fee
          })
        );

        // Add platform creation fee if configured
        if (PLATFORM_CREATION_FEE_SOL > 0 && PLATFORM_TREASURY) {
          const platformTreasuryPk = new PublicKey(PLATFORM_TREASURY);
          tx2.add(
            SystemProgram.transfer({
              fromPubkey: payer,
              toPubkey: platformTreasuryPk,
              lamports: Math.floor(PLATFORM_CREATION_FEE_SOL * LAMPORTS_PER_SOL),
            })
          );
        }

        // Add token distribution instructions
        tx2.add(
          createCreatorAtaIx,
          createReserveAtaIx,
          mintToCreatorIx,
          mintToReserveIx
        );

        // Add liquidity funding if applicable
        if (liquidityUSD >= 20) {
          const liquidityWalletPk = new PublicKey(
            form.liquidityWallet || payer.toBase58()
          );
          tx2.add(
            SystemProgram.transfer({
              fromPubkey: payer,
              toPubkey: liquidityWalletPk,
              lamports: Math.floor(liquiditySol * LAMPORTS_PER_SOL),
            })
          );
        }

        tx2.feePayer = payer;
        const { blockhash: blockhash2, lastValidBlockHeight: lastValidBlockHeight2 } =
          await connection.getLatestBlockhash();
        tx2.recentBlockhash = blockhash2;

        setStatus("🔐 Awaiting signature for token distribution...");
        const signed2 = await signTransaction(tx2);

        setStatus("📤 Sending transaction 2/3...");
        const sig2 = await connection.sendRawTransaction(signed2.serialize(), {
          skipPreflight: false,
          maxRetries: 3,
        });

        setStatus("⏳ Confirming transaction 2/3...");
        try {
          const confirmation2 = await connection.confirmTransaction({
            signature: sig2,
            blockhash: blockhash2,
            lastValidBlockHeight: lastValidBlockHeight2,
          }, "confirmed");

          if (confirmation2.value.err) {
            throw new Error(`Transaction 2 failed: ${JSON.stringify(confirmation2.value.err)}`);
          }
        } catch (confirmErr: any) {
          console.error("Confirmation error:", confirmErr);
          const status = await connection.getSignatureStatus(sig2);
          if (status?.value?.err) {
            throw new Error(`Transaction 2 failed: ${JSON.stringify(status.value.err)}`);
          }
          if (!(status?.value?.confirmationStatus === "confirmed" ||
                status?.value?.confirmationStatus === "finalized")) {
            throw new Error(`Transaction 2 not confirmed. Signature: ${sig2}`);
          }
        }

        setStatus("✅ Tokens distributed! Now adding metadata and security...");

        // ====================================================================
        // TRANSACTION 3: Add Metadata & Revoke Authorities
        // Final step - add metadata and lock down security
        // ====================================================================
        setStatus("📋 Step 3/3: Adding metadata and revoking authorities...");

        const tx3 = new Transaction();

        // Add compute budget for transaction 3 (metadata + revokes)
        tx3.add(
          ComputeBudgetProgram.setComputeUnitLimit({
            units: 200_000, // Sufficient for metadata and revokes
          })
        );

        tx3.add(
          ComputeBudgetProgram.setComputeUnitPrice({
            microLamports: 1000, // Priority fee
          })
        );

        // IMPORTANT: Metadata must be created BEFORE revoking authorities
        // Metaplex requires valid mint authority to create metadata
        tx3.add(
          createMetadataIx,         // Create metadata while mint authority is valid
          revokeMintAuthorityIx,    // Then revoke mint authority to null
          revokeFreezeAuthorityIx   // Then revoke freeze authority to null
        );

        tx3.feePayer = payer;
        const { blockhash: blockhash3, lastValidBlockHeight: lastValidBlockHeight3 } =
          await connection.getLatestBlockhash();
        tx3.recentBlockhash = blockhash3;

        setStatus("🔐 Awaiting signature for metadata and security...");
        const signed3 = await signTransaction(tx3);

        setStatus("📤 Sending transaction 3/3...");
        const sig3 = await connection.sendRawTransaction(signed3.serialize(), {
          skipPreflight: false,
          maxRetries: 3,
        });

        setStatus("⏳ Confirming transaction 3/3...");
        try {
          const confirmation3 = await connection.confirmTransaction({
            signature: sig3,
            blockhash: blockhash3,
            lastValidBlockHeight: lastValidBlockHeight3,
          }, "confirmed");

          if (confirmation3.value.err) {
            throw new Error(`Transaction 3 failed: ${JSON.stringify(confirmation3.value.err)}`);
          }
        } catch (confirmErr: any) {
          console.error("Confirmation error:", confirmErr);
          const status = await connection.getSignatureStatus(sig3);
          if (status?.value?.err) {
            throw new Error(`Transaction 3 failed: ${JSON.stringify(status.value.err)}`);
          }
          if (!(status?.value?.confirmationStatus === "confirmed" ||
                status?.value?.confirmationStatus === "finalized")) {
            throw new Error(`Transaction 3 not confirmed. Signature: ${sig3}`);
          }
        }

        setMintAddress(mint.publicKey.toBase58());
        setStatus(`✅ Token launch complete! Mint: ${mint.publicKey.toBase58().slice(0, 8)}...`);

        const sig = sig1; // Use first transaction signature for recording

        // 4) Record launch in Firestore with bonding curve data
        try {
          // Encode reserve wallet private key for storage
          const reservePrivateKey = Buffer.from(reserveWallet.secretKey).toString('base64');

          const res = await fetch("/api/record-launch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mintAddress: mint.publicKey.toBase58(),
              name: form.name,
              symbol: form.symbol,
              description: form.description,
              imageUrl,
              metadataUrl: metadataUri,
              network,
              mintSignature: sig,
              creator: payer.toBase58(),
              curveReserveWallet: reserveWallet.publicKey.toBase58(),
              reservePrivateKey, // Store encrypted in production!
              website: form.website,
              twitter: form.twitter,
              bondingCurve: {
                totalSupply: reserveAmount.toString(),
                initialPrice: 0.000000001, // 1 nano-SOL per token
                finalPrice: 0.001, // 1 milli-SOL per token
                platformFeeBps: 100, // 1%
                creatorFeeBps: 100, // 1%
              },
              curveState: {
                tokensRemaining: reserveAmount.toString(),
                tokensSold: "0",
                solCollected: "0",
              },
            }),
          });

          if (!res.ok) {
            const body = await res.text();
            console.error(`record-launch failed (${res.status}): ${body}`);
          }
        } catch (recErr: any) {
          console.error("record-launch failed:", recErr);
        }
      } catch (e: any) {
        console.error(e);
        setStatus(`❌ Mint failed: ${e.message || String(e)}`);
        setMintAddress("");
      }
    },
    [
      mounted,
      connected,
      publicKey,
      signTransaction,
      connection,
      network,
      file,
      form.name,
      form.symbol,
      form.description,
      form.liquidityFundingSol,
      form.liquidityWallet,
      form.website,
      form.twitter,
    ]
  );

  if (!mounted) return null;

  return (
    <main className="min-h-screen px-6 py-10 bg-linear-to-b from-black to-zinc-900 text-white">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img
              src="/logo.png"
              alt="Rocket Mint Logo"
              className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 shrink-0"
            />
            <h1 className="text-lg sm:text-2xl font-bold truncate">Launch Coin</h1>
          </div>
          <div className="shrink-0">
            <WalletMultiButton />
          </div>
        </div>

        {/* Balance warning banner */}
        {connected && solBalance > 0 && solBalance < minRequiredBalance && (
          <div className="mt-4 p-4 rounded-lg bg-amber-900/30 border border-amber-600/50">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-400">Insufficient SOL Balance</p>
                <p className="mt-1 text-sm text-amber-200/90">
                  Your wallet has <span className="font-mono font-semibold">{solBalance.toFixed(4)} SOL</span>.
                  You need at least <span className="font-mono font-semibold">{minRequiredBalance.toFixed(3)} SOL</span> to launch this token
                  (includes platform fee, network fees, and liquidity funding).
                </p>
                <p className="mt-2 text-xs text-amber-300/80">
                  Please add more SOL to your wallet before launching.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Display current balance when connected */}
        {connected && solBalance > 0 && (
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-sm text-zinc-500">
              Wallet Balance: <span className="font-mono text-zinc-300 font-semibold">{solBalance.toFixed(4)} SOL</span>
            </div>

          </div>
        )}

        <p className="mt-2 text-sm text-zinc-400">
          Upload an image, add details, and launch your token. We automatically mint
          1 billion tokens with a fair launch model: 1% to you, 99% to the bonding curve
          for community trading.
          {PLATFORM_CREATION_FEE_SOL > 0 && (
            <span className="block mt-1 text-emerald-400 font-medium">
              Platform fee: {PLATFORM_CREATION_FEE_SOL} SOL per token creation
            </span>
          )}
        </p>

        <div className="mt-6 grid gap-4">
          {/* Name / Symbol */}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm text-zinc-300">Name</span>
              <input
                name="name"
                value={form.name}
                onChange={onChange}
                placeholder="Pepito Inu"
                className="mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-800 p-2"
              />
            </label>
            <label className="block">
              <span className="text-sm text-zinc-300">Symbol</span>
              <input
                name="symbol"
                value={form.symbol}
                onChange={onChange}
                placeholder="PEPI"
                className="mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-800 p-2"
              />
            </label>
          </div>

          {/* Description */}
          <label className="block">
            <span className="text-sm text-zinc-300">Description</span>
            <textarea
              name="description"
              value={form.description}
              onChange={onChange}
              rows={3}
              placeholder="World's spiciest meme coin."
              className="mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-800 p-2"
            />
          </label>

          {/* Social Links */}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm text-zinc-300">Website (Optional)</span>
              <input
                name="website"
                value={form.website}
                onChange={onChange}
                placeholder="https://yourtoken.com"
                className="mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-800 p-2"
              />
            </label>
            <label className="block">
              <span className="text-sm text-zinc-300">X/Twitter (Optional)</span>
              <input
                name="twitter"
                value={form.twitter}
                onChange={onChange}
                placeholder="https://x.com/yourtoken"
                className="mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-800 p-2"
              />
            </label>
          </div>

          {/* Image upload */}
          <div className="block">
            <span className="text-sm text-zinc-300 block mb-2">Token Image ( Required )</span>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block cursor-pointer">
                  <div
                    className="border-2 border-dashed border-zinc-700 rounded-lg p-4 hover:border-zinc-500 transition text-center"
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onFileChange}
                      className="hidden"
                    />
                    <div className="text-zinc-400 text-sm">
                      {file ? (
                        <span className="text-emerald-400">✓ {file.name}</span>
                      ) : (
                        <>
                          <span className="block mb-1">📁 Click to upload</span>
                          <span className="text-xs">or drag and drop</span>
                        </>
                      )}
                    </div>
                  </div>
                </label>
              </div>
              {imagePreview && (
                <div className="flex items-center justify-center">
                  <div className="relative w-full max-w-[200px] aspect-square rounded-lg overflow-hidden border border-zinc-700">
                    <img
                      src={imagePreview}
                      alt="Token preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Token Info Box */}
          <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
            <p className="text-sm text-zinc-300 mb-2">
              <span className="font-semibold">Token Details:</span>
            </p>
            <ul className="text-sm text-zinc-400 space-y-1">
              <li>• Total Supply: <span className="text-white font-mono">1,000,000,000</span> tokens</li>
              <li>• Decimals: <span className="text-white font-mono">6</span></li>
              <li>• Creator Allocation: <span className="text-emerald-400 font-mono">1%</span> (10M tokens)</li>
              <li>• Bonding Curve: <span className="text-blue-400 font-mono">99%</span> (990M tokens)</li>
            </ul>

            {/* Security Badge */}
            <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <div className="flex items-start gap-2">
                <span className="text-base shrink-0">🔒</span>
                <div>
                  <p className="text-xs font-semibold text-emerald-400">100% Immutable Supply</p>
                  <p className="text-xs text-emerald-300/80 mt-0.5">
                    Mint authority is automatically burned after creation. No one can ever mint additional tokens beyond the initial 1B supply.
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-2 text-xs text-zinc-500">
              Fair launch model - nearly all tokens available for community trading.{" "}
              <Link href="/whitepaper" className="text-violet-400 hover:text-violet-300 underline">
                Read our whitepaper
              </Link>
            </p>
          </div>

          {/* Liquidity funding */}
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm text-zinc-300">
                Liquidity Funding (USD) <span className="text-red-400">*</span>
              </span>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                <input
                  type="number"
                  name="liquidityFundingSol"
                  value={form.liquidityFundingSol}
                  onChange={onChange}
                  placeholder="20"
                  min="20"
                  step="1"
                  className="w-full rounded-lg bg-zinc-900 border border-zinc-800 p-2 pl-7"
                />
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Required minimum: <span className="font-semibold text-emerald-400">$20 USD</span>.
                Funds sent to liquidity wallet for pool launch.
                {solPriceUSD > 0 && form.liquidityFundingSol && Number(form.liquidityFundingSol) >= 20 && (
                  <span className="block mt-1 text-violet-400">
                    ≈ {(Number(form.liquidityFundingSol) / solPriceUSD).toFixed(4)} SOL
                  </span>
                )}
              </p>
            </label>
            <label className="block">
              <span className="text-sm text-zinc-300">Liquidity Wallet</span>
              <input
                name="liquidityWallet"
                value={form.liquidityWallet}
                onChange={onChange}
                placeholder="Your wallet address"
                className="mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-800 p-2 font-mono text-xs"
                readOnly
              />
              <p className="mt-1 text-xs text-zinc-500">
                Liquidity funds will be sent to your connected wallet
              </p>
            </label>
          </div>

          {/* Cost Breakdown */}
          {connected && Number(form.liquidityFundingSol || "0") >= 20 && solPriceUSD > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-violet-500/10 border border-violet-500/30">
              <h3 className="text-sm font-semibold text-violet-400 mb-3">
                💰 Total Cost Breakdown
              </h3>
              <div className="space-y-2 text-sm">
                {/* Platform Fee */}
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Platform Creation Fee:</span>
                  <div className="text-right">
                    <div className="text-white font-semibold">
                      ${(PLATFORM_CREATION_FEE_SOL * solPriceUSD).toFixed(2)} USD
                    </div>
                    <div className="text-xs text-zinc-500">{PLATFORM_CREATION_FEE_SOL} SOL</div>
                  </div>
                </div>

                {/* Network Fees */}
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Network Fees (est.):</span>
                  <div className="text-right">
                    <div className="text-white font-semibold">
                      ${(0.015 * solPriceUSD).toFixed(2)} USD
                    </div>
                    <div className="text-xs text-zinc-500">~0.015 SOL</div>
                  </div>
                </div>

                {/* Liquidity Funding */}
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Liquidity Funding:</span>
                  <div className="text-right">
                    <div className="text-white font-semibold">
                      ${Number(form.liquidityFundingSol || "0").toFixed(2)} USD
                    </div>
                    <div className="text-xs text-zinc-500">
                      {(Number(form.liquidityFundingSol || "0") / solPriceUSD).toFixed(4)} SOL
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center pt-2 border-t border-violet-500/30">
                  <span className="text-emerald-400 font-bold">Total Cost:</span>
                  <div className="text-right">
                    <div className="text-emerald-400 font-bold text-lg">
                      ${(PLATFORM_CREATION_FEE_SOL * solPriceUSD + 0.015 * solPriceUSD + Number(form.liquidityFundingSol || "0")).toFixed(2)} USD
                    </div>
                    <div className="text-xs text-emerald-500/70">
                      ≈ {(PLATFORM_CREATION_FEE_SOL + 0.015 + Number(form.liquidityFundingSol || "0") / solPriceUSD).toFixed(4)} SOL
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add SOL Button - Show when balance is insufficient */}
          {connected && solBalance > 0 && solBalance < minRequiredBalance && (
            <button
              onClick={() => setShowDepositModal(true)}
              className="mt-2 w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 transition py-2.5 px-3 flex items-center justify-center gap-2 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add SOL to Launch (Need {(minRequiredBalance - solBalance).toFixed(3)} SOL)
            </button>
          )}

          <button
            onClick={launch}
            disabled={
              !connected ||
              (connected && solBalance > 0 && solBalance < minRequiredBalance) ||
              Number(form.liquidityFundingSol || "0") < 20
            }
            className="mt-2 w-full rounded-lg bg-white/10 hover:bg-white/20 transition py-2 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {!connected
              ? "Connect Wallet First"
              : solBalance > 0 && solBalance < minRequiredBalance
                ? `Insufficient SOL Balance (Need ${minRequiredBalance.toFixed(3)} SOL)`
                : Number(form.liquidityFundingSol || "0") < 20
                  ? "Minimum $20 Liquidity Required"
                  : "Launch Coin"}
          </button>
        </div>

        <div className="mt-6 rounded-xl border border-zinc-800 p-5">
          <h2 className="font-semibold mb-3">Status</h2>
          <p className="text-sm text-zinc-300 mb-3">
            {status || "—"}
          </p>
          {mintAddress && (
            <>
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 mb-4">
                <p className="text-xs text-zinc-400 mb-1">Mint Address:</p>
                <code className="text-sm break-all text-emerald-400">{mintAddress}</code>
              </div>
              {status.includes("✅") && (
                <div className="flex gap-3">
                  <button
                    onClick={() => router.push(`/swap/${mintAddress}`)}
                    className="flex-1 py-3 px-6 bg-linear-to-r from-violet-600 to-emerald-600 hover:from-violet-700 hover:to-emerald-700 rounded-lg font-semibold text-white transition shadow-lg"
                  >
                    View Token Page →
                  </button>
                  <button
                    onClick={() => router.push("/marketplace")}
                    className="py-3 px-6 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium text-white transition"
                  >
                    View Marketplace
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && connected && publicKey && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
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
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setDepositMethod("crypto")}
                className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition ${
                  depositMethod === "crypto"
                    ? "bg-violet-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                Crypto Transfer
              </button>
              <button
                onClick={() => setDepositMethod("card")}
                className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition ${
                  depositMethod === "card"
                    ? "bg-violet-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                💳 Credit Card
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
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5">
                      <code className="text-xs text-emerald-400 break-all">
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
                    </div>
                  </div>
                )}

                {/* Warning */}
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3">
                  <p className="text-xs text-red-400">
                    ⚠️ Only send SOL on the <strong>{network}</strong> network. Sending to the wrong network will result in loss of funds.
                  </p>
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
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-600/20 flex items-center justify-center text-emerald-400">
                      ✓
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Instant Delivery</p>
                      <p className="text-xs text-zinc-500">SOL delivered to your wallet in minutes</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-600/20 flex items-center justify-center text-emerald-400">
                      ✓
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Secure Payment</p>
                      <p className="text-xs text-zinc-500">Bank-grade security and encryption</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-600/20 flex items-center justify-center text-emerald-400">
                      ✓
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Multiple Payment Methods</p>
                      <p className="text-xs text-zinc-500">Credit card, debit card, and more</p>
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

      <BottomNav />
    </main>
  );
}
