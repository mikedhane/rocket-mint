"use client";

import React, { PropsWithChildren, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl, Cluster } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";

const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK as Cluster) ?? "devnet";

export default function Providers({ children }: PropsWithChildren) {
  // RPC endpoint with CORS support
  const endpoint = useMemo(() => {
    if (network === "mainnet-beta") {
      return "https://solana-mainnet.g.alchemy.com/v2/RVeMfinzUHGfNq_Alf3VR";
    }
    return clusterApiUrl(network);
  }, [network]);

  // Supported wallets (deduped by name to avoid MetaMask key collisions)
  const wallets = useMemo(() => {
    const raw = [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      // Coinbase wallet removed - has connection issues across browsers
      // new CoinbaseWalletAdapter(),
      // ⚠️ If you ever add MetaMask or other adapters, put them here ONCE
      // new MetaMaskWalletAdapter(),  // example – but don't add twice
    ];

    // Deduplicate by adapter.name so React keys are unique
    const map = new Map<string, typeof raw[number]>();
    for (const w of raw) {
      if (!w.name) continue;
      if (map.has(w.name)) continue; // drop duplicates (e.g., two "MetaMask")
      map.set(w.name, w);
    }

    const uniqueWallets = Array.from(map.values());
    if (typeof window !== "undefined") {
      console.log("Solana wallet adapters:", uniqueWallets.map((w) => w.name));
    }

    return uniqueWallets;
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
