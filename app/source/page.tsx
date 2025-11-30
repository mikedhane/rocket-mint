"use client";

import { useState } from "react";
import Link from "next/link";

export default function SourceCodePage() {
  const [copied, setCopied] = useState(false);

  const repoUrl = "https://github.com/mikedhane/rocket-mint";
  const features = [
    "100% immutable token supply with automatic mint authority revocation",
    "Fair launch model: 99% to bonding curve, 1% to creator",
    "Metaplex Token Metadata integration",
    "Bonding curve trading mechanism",
    "Firebase backend with real-time updates",
    "Next.js 15 with App Router",
    "Solana Web3.js integration",
    "TypeScript throughout",
  ];

  const copyRepoUrl = () => {
    navigator.clipboard.writeText(repoUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen px-6 py-10 bg-gradient-to-b from-black to-zinc-900 text-white">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-zinc-400 hover:text-white transition"
          >
            ← Back to Home
          </Link>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-8 shadow-2xl">
          <h1 className="text-4xl font-bold mb-4">Open Source</h1>
          <p className="text-xl text-zinc-300 mb-8">
            Rocket-Mint is completely open source. Built for the community, by the community.
          </p>

          <div className="grid gap-8">
            {/* Source Code Section */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">Source Code</h2>
              <p className="text-zinc-300 mb-4">
                The entire codebase for this platform is available for anyone to view, learn from,
                fork, and contribute to. We believe in transparency and open collaboration.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition"
                >
                  View on GitHub →
                </a>

                <button
                  onClick={copyRepoUrl}
                  className="inline-flex items-center justify-center px-6 py-3 bg-zinc-800 text-white font-semibold rounded-lg hover:bg-zinc-700 transition"
                >
                  {copied ? "Copied!" : "Copy Repo URL"}
                </button>
              </div>
            </section>

            {/* Tech Stack */}
            <section className="border-t border-zinc-800 pt-8">
              <h2 className="text-2xl font-semibold mb-4">Tech Stack</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-zinc-300 mb-2">Frontend</h3>
                  <ul className="text-zinc-400 space-y-1 text-sm">
                    <li>• Next.js 15 (App Router)</li>
                    <li>• React 19</li>
                    <li>• TypeScript</li>
                    <li>• Tailwind CSS</li>
                    <li>• Solana Wallet Adapter</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-zinc-300 mb-2">Backend</h3>
                  <ul className="text-zinc-400 space-y-1 text-sm">
                    <li>• Firebase (Firestore, Storage, Hosting)</li>
                    <li>• Solana Web3.js</li>
                    <li>• SPL Token Program</li>
                    <li>• Metaplex Token Metadata</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Key Features */}
            <section className="border-t border-zinc-800 pt-8">
              <h2 className="text-2xl font-semibold mb-4">Key Features</h2>
              <ul className="space-y-2 text-zinc-300">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </section>

            {/* License */}
            <section className="border-t border-zinc-800 pt-8">
              <h2 className="text-2xl font-semibold mb-4">License</h2>
              <p className="text-zinc-300 mb-4">
                This project is open source and available under the MIT License.
              </p>
              <div className="bg-zinc-900 rounded-lg p-4 font-mono text-sm text-zinc-400">
                <p>MIT License</p>
                <p className="mt-2">Copyright (c) 2024 Rocket-Mint</p>
                <p className="mt-2">
                  Permission is hereby granted, free of charge, to any person obtaining a copy
                  of this software and associated documentation files (the "Software"), to deal
                  in the Software without restriction...
                </p>
              </div>
            </section>

            {/* Contribute */}
            <section className="border-t border-zinc-800 pt-8">
              <h2 className="text-2xl font-semibold mb-4">Contribute</h2>
              <p className="text-zinc-300 mb-4">
                We welcome contributions from the community! Whether it's bug fixes, new features,
                documentation improvements, or feedback - all contributions are appreciated.
              </p>

              <div className="grid sm:grid-cols-3 gap-4">
                <a
                  href={`${repoUrl}/issues`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 border border-zinc-800 rounded-lg hover:border-zinc-600 transition"
                >
                  <h3 className="font-semibold mb-2">Report Issues</h3>
                  <p className="text-sm text-zinc-400">
                    Found a bug? Let us know!
                  </p>
                </a>

                <a
                  href={`${repoUrl}/pulls`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 border border-zinc-800 rounded-lg hover:border-zinc-600 transition"
                >
                  <h3 className="font-semibold mb-2">Submit PRs</h3>
                  <p className="text-sm text-zinc-400">
                    Contribute code improvements
                  </p>
                </a>

                <a
                  href={`${repoUrl}/discussions`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 border border-zinc-800 rounded-lg hover:border-zinc-600 transition"
                >
                  <h3 className="font-semibold mb-2">Discussions</h3>
                  <p className="text-sm text-zinc-400">
                    Join the conversation
                  </p>
                </a>
              </div>
            </section>

            {/* Transparency Note */}
            <section className="border-t border-zinc-800 pt-8">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
                <h3 className="font-semibold text-blue-400 mb-2">100% Transparent</h3>
                <p className="text-zinc-300">
                  Every line of code that powers this platform is available for inspection.
                  We believe in building trust through transparency, not obscurity.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
