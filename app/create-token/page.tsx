"use client";

import { useMemo, useState, useCallback, ChangeEvent } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  PublicKey,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  MINT_SIZE,
  createInitializeMint2Instruction,
  createMintToInstruction,
} from "@solana/spl-token";

type SolanaNetwork = "devnet" | "mainnet-beta" | "testnet";

type FormState = {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: string;
};

/** Safely convert a decimal string (e.g., "1.25") to base units (BigInt) for given decimals */
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

export default function CreateTokenPage() {
  const { connected, publicKey, signTransaction } = useWallet();

  const [form, setForm] = useState<FormState>({
    name: "",
    symbol: "",
    decimals: 6,
    initialSupply: "1_000_000", // human-readable
  });
  const [status, setStatus] = useState<string>("");
  const [mintAddress, setMintAddress] = useState<string>("");

  const network: SolanaNetwork =
    (process.env.NEXT_PUBLIC_SOLANA_NETWORK as SolanaNetwork) || "devnet";

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

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((s) => ({
      ...s,
      [name]: name === "decimals" ? Number(value) : value,
    }));
  };

  const createToken = useCallback(async () => {
    try {
      if (!connected || !publicKey || !signTransaction) {
        throw new Error("Connect a wallet first.");
      }
      setStatus("Preparing transaction…");

      const payer = publicKey as PublicKey;

      // 1) New mint account
      const mint = Keypair.generate();

      // 2) Rent-exempt lamports
      const lamportsForMint =
        await connection.getMinimumBalanceForRentExemption(MINT_SIZE);

      // 3) Create mint account
      const createMintIx = SystemProgram.createAccount({
        fromPubkey: payer,
        newAccountPubkey: mint.publicKey,
        space: MINT_SIZE,
        lamports: lamportsForMint,
        programId: TOKEN_PROGRAM_ID,
      });

      const decimals = Number(form.decimals ?? 6);

      // 4) Initialize mint
      const initMintIx = createInitializeMint2Instruction(
        mint.publicKey,
        decimals,
        payer,
        payer,
        TOKEN_PROGRAM_ID
      );

      // 5) Create your ATA
      const ata = getAssociatedTokenAddressSync(
        mint.publicKey,
        payer,
        false,
        TOKEN_PROGRAM_ID
      );
      const createAtaIx = createAssociatedTokenAccountInstruction(
        payer, // payer
        ata, // ATA
        payer, // owner
        mint.publicKey,
        TOKEN_PROGRAM_ID
      );

      // 6) Mint initial supply
      const baseUnits = toBaseUnits(
        String(form.initialSupply).replaceAll("_", ""),
        decimals
      );
      const mintToIx = createMintToInstruction(
        mint.publicKey,
        ata,
        payer, // mint authority
        baseUnits, // BigInt is fine with current spl-token versions
        [],
        TOKEN_PROGRAM_ID
      );

      const tx = new Transaction().add(
        createMintIx,
        initMintIx,
        createAtaIx,
        mintToIx
      );
      tx.feePayer = payer;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      // Partially sign with mint keypair
      tx.partialSign(mint);

      setStatus("Requesting wallet signature…");
      const signedTx = await signTransaction(tx);

      setStatus("Sending transaction…");
      const sig = await connection.sendRawTransaction(signedTx.serialize());

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
        setStatus(`✅ Token created! Signature: ${sig}`);
      } catch (confirmError) {
        // Check signature status if confirmation times out
        const signatureStatus = await connection.getSignatureStatus(sig);
        if (signatureStatus?.value?.confirmationStatus === "confirmed" ||
            signatureStatus?.value?.confirmationStatus === "finalized") {
          setStatus(`✅ Token created! Signature: ${sig}`);
        } else if (signatureStatus?.value?.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(signatureStatus.value.err)}`);
        } else {
          setStatus(`⏳ Transaction submitted! Check Solana Explorer: https://explorer.solana.com/tx/${sig}${network === "devnet" ? "?cluster=devnet" : ""}`);
        }
      }

      setMintAddress(mint.publicKey.toBase58());
      console.log("Mint:", mint.publicKey.toBase58(), "ATA:", ata.toBase58());
    } catch (e: any) {
      console.error(e);
      setStatus(`❌ ${e.message || String(e)}`);
    }
  }, [connected, publicKey, signTransaction, connection, form.decimals, form.initialSupply]);

  return (
    <main className="min-h-screen px-6 py-10 bg-linear-to-b from-black to-zinc-900 text-white">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950/60 p-8 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Create SPL Token (Devnet)</h1>
          <WalletMultiButton />
        </div>

        <p className="mt-2 text-sm text-zinc-400">
          This creates a classic SPL token on{" "}
          <span className="font-mono">{network}</span>, mints the initial supply
          to your wallet’s associated token account. (Metadata/NFT-style name &
          symbol can be added later.)
        </p>

        <div className="mt-6 grid gap-4">
          <label className="block">
            <span className="text-sm text-zinc-300">
              Token Name (off-chain / UI only)
            </span>
            <input
              name="name"
              value={form.name}
              onChange={onChange}
              placeholder="Pepito Inu"
              className="mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-800 p-2"
            />
          </label>

          <label className="block">
            <span className="text-sm text-zinc-300">
              Symbol (off-chain / UI only)
            </span>
            <input
              name="symbol"
              value={form.symbol}
              onChange={onChange}
              placeholder="PEPI"
              className="mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-800 p-2"
            />
          </label>

          <label className="block">
            <span className="text-sm text-zinc-300">Decimals</span>
            <input
              type="number"
              min={0}
              max={9}
              name="decimals"
              value={form.decimals}
              onChange={onChange}
              className="mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-800 p-2"
            />
          </label>

          <label className="block">
            <span className="text-sm text-zinc-300">
              Initial Supply (human-readable)
            </span>
            <input
              name="initialSupply"
              value={form.initialSupply}
              onChange={onChange}
              placeholder="1_000_000"
              className="mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-800 p-2"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Example: with 6 decimals, “1_000_000” means 1,000,000.000000
              tokens minted to you.
            </p>
          </label>

          <button
            onClick={createToken}
            disabled={!connected}
            className="mt-2 w-full rounded-lg bg-white/10 hover:bg-white/20 transition py-2 px-3"
          >
            {connected ? "Create Token" : "Connect Wallet First"}
          </button>
        </div>

        <div className="mt-6 rounded-xl border border-zinc-800 p-5">
          <h2 className="font-semibold mb-2">Status</h2>
          <p className="text-sm text-zinc-300 wrap-break-words">
            {status || "—"}
          </p>

          {mintAddress && (
            <p className="mt-2 text-sm">
              Mint Address:{" "}
              <code className="break-all">{mintAddress}</code>
            </p>
          )}
        </div>

        <div className="mt-8 rounded-xl border border-zinc-800 p-5">
          <h2 className="font-semibold mb-2">Notes & Next</h2>
          <ul className="list-disc list-inside text-sm text-zinc-300 space-y-1">
            <li>
              This uses the classic <code>TOKEN_PROGRAM_ID</code>. Later we’ll
              switch to <code>Token-2022</code> with transfer fees.
            </li>
            <li>
              For on-chain <strong>name/symbol/image</strong>, we’ll add Metaplex
              Token Metadata.
            </li>
            <li>
              After minting, we’ll add a <strong>Swap</strong> tab (Jupiter) and
              a <strong>Launch Liquidity</strong> helper (Raydium).
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
