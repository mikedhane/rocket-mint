"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function WhitepaperPage() {
  return (
    <main className="min-h-screen bg-linear-to-b from-zinc-950 to-zinc-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <img
              src="/logo.png"
              alt="Rocket-Mint Logo"
              className="w-16 h-16"
            />
            <div>
              <h1 className="text-4xl font-bold">Rocket-Mint Whitepaper</h1>
              <p className="text-zinc-400 mt-1">Technical Overview & Security Guarantees</p>
            </div>
          </div>
          <div className="h-1 w-24 bg-linear-to-r from-violet-600 to-emerald-500 rounded-full"></div>
        </div>

        {/* Executive Summary */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-emerald-400">Executive Summary</h2>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <p className="text-zinc-300 leading-relaxed mb-4">
              Rocket-Mint is the most transparent and secure fair launch platform on Solana, designed to eliminate
              rug pull risks and ensure complete trust between token creators and their communities. By automatically
              burning mint authority and freeze authority at token creation, we guarantee that the total supply is
              permanently fixed and tokens can always trade freely.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                <div className="text-2xl font-bold text-emerald-400 mb-1">100%</div>
                <div className="text-xs text-zinc-400">Immutable Supply Guarantee</div>
              </div>
              <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-4">
                <div className="text-2xl font-bold text-violet-400 mb-1">99%</div>
                <div className="text-xs text-zinc-400">To Bonding Curve</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-400 mb-1">0</div>
                <div className="text-xs text-zinc-400">Rug Pull Risk</div>
              </div>
            </div>
          </div>
        </section>

        {/* What is Rocket-Mint */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">1. What is Rocket-Mint?</h2>
          <div className="prose prose-invert max-w-none">
            <p className="text-zinc-300 leading-relaxed mb-4">
              Rocket-Mint is a decentralized token launch platform built on the Solana blockchain that enables anyone
              to create and launch SPL tokens with guaranteed security features. Unlike traditional token creation tools,
              Rocket-Mint enforces a fair launch model where the token supply is provably immutable from the moment of creation.
            </p>

            <h3 className="text-xl font-semibold text-white mb-3 mt-6">Key Features</h3>
            <ul className="space-y-3 text-zinc-300">
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 mt-1">✓</span>
                <span><strong className="text-white">Automatic Mint Authority Burning:</strong> The platform automatically
                revokes mint authority after token creation, making it impossible to mint additional tokens beyond the
                initial 1 billion supply.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 mt-1">✓</span>
                <span><strong className="text-white">Freeze Authority Revocation:</strong> Freeze authority is also burned,
                ensuring tokens can never be locked or frozen in user wallets.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 mt-1">✓</span>
                <span><strong className="text-white">Fair Distribution:</strong> Fixed allocation of 1% to creator and 99%
                to bonding curve for community access.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 mt-1">✓</span>
                <span><strong className="text-white">Instant Liquidity:</strong> Automated bonding curve provides immediate
                trading capability.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-emerald-400 mt-1">✓</span>
                <span><strong className="text-white">On-Chain Verification:</strong> All security guarantees are verifiable
                directly on the Solana blockchain.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">2. How Rocket-Mint Works</h2>

          <div className="space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-violet-400 mb-3">Step 1: Token Configuration</h3>
              <p className="text-zinc-300 leading-relaxed">
                Creators provide basic token information including name, symbol, description, and image. They also
                specify the initial liquidity funding amount (minimum $20 USD converted to SOL), which is sent to the
                bonding curve wallet to establish initial market depth.
              </p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-violet-400 mb-3">Step 2: On-Chain Token Creation</h3>
              <p className="text-zinc-300 leading-relaxed mb-4">
                The platform executes a single atomic transaction that performs the following operations in order:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-zinc-300 ml-4">
                <li>Creates a new SPL token mint account with 6 decimals</li>
                <li>Initializes the mint with the creator as temporary mint authority</li>
                <li>Creates associated token accounts for creator and bonding curve</li>
                <li>Mints 10,000,000 tokens (1%) to creator wallet</li>
                <li>Mints 990,000,000 tokens (99%) to bonding curve wallet</li>
                <li className="font-bold text-emerald-400">Revokes mint authority by setting it to null</li>
                <li className="font-bold text-emerald-400">Revokes freeze authority by setting it to null</li>
                <li>Creates Metaplex metadata with token information</li>
              </ol>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-violet-400 mb-3">Step 3: Bonding Curve Activation</h3>
              <p className="text-zinc-300 leading-relaxed">
                The bonding curve is immediately active, allowing users to buy and sell tokens with automatic price
                discovery based on supply and demand. The curve uses a mathematical formula that increases price as
                more tokens are purchased, creating natural price appreciation with growing demand.
              </p>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-violet-400 mb-3">Step 4: Community Trading</h3>
              <p className="text-zinc-300 leading-relaxed">
                Users can immediately begin trading on the bonding curve. As the bonding curve collects SOL from purchases,
                it builds toward a graduation threshold. Upon graduation, liquidity can be migrated to a traditional DEX
                like Raydium for expanded trading options.
              </p>
            </div>
          </div>
        </section>

        {/* Technical Implementation */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">3. Technical Implementation</h2>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-emerald-400 mb-4">Authority Revocation Code</h3>
            <p className="text-zinc-300 text-sm mb-4">
              The critical security feature is implemented using SPL Token's <code className="text-violet-400 bg-zinc-950 px-2 py-0.5 rounded">setAuthority</code> instruction:
            </p>
            <div className="bg-zinc-950 border border-zinc-700 rounded-lg p-4 overflow-x-auto">
              <pre className="text-xs text-emerald-400">
{`// Revoke mint authority - prevents any future minting
const revokeMintAuthorityIx = createSetAuthorityInstruction(
  mint.publicKey,
  payer,
  AuthorityType.MintTokens,
  null, // Setting to null burns the authority permanently
  [],
  TOKEN_PROGRAM_ID
);

// Revoke freeze authority - ensures tokens can never be frozen
const revokeFreezeAuthorityIx = createSetAuthorityInstruction(
  mint.publicKey,
  payer,
  AuthorityType.FreezeAccount,
  null, // Setting to null burns the authority permanently
  [],
  TOKEN_PROGRAM_ID
);`}
              </pre>
            </div>
            <p className="text-zinc-400 text-sm mt-4">
              These instructions are executed immediately after minting the initial supply, ensuring no window exists
              where additional tokens could be created.
            </p>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-emerald-400 mb-4">Token Specifications</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-zinc-950/50 border border-zinc-700 rounded-lg p-4">
                <div className="text-xs text-zinc-500 mb-1">Total Supply</div>
                <div className="text-xl font-bold text-white">1,000,000,000</div>
              </div>
              <div className="bg-zinc-950/50 border border-zinc-700 rounded-lg p-4">
                <div className="text-xs text-zinc-500 mb-1">Decimals</div>
                <div className="text-xl font-bold text-white">6</div>
              </div>
              <div className="bg-zinc-950/50 border border-zinc-700 rounded-lg p-4">
                <div className="text-xs text-zinc-500 mb-1">Creator Allocation</div>
                <div className="text-xl font-bold text-emerald-400">1% (10M tokens)</div>
              </div>
              <div className="bg-zinc-950/50 border border-zinc-700 rounded-lg p-4">
                <div className="text-xs text-zinc-500 mb-1">Bonding Curve Supply</div>
                <div className="text-xl font-bold text-blue-400">99% (990M tokens)</div>
              </div>
            </div>
          </div>
        </section>

        {/* Security Guarantees */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">4. Security Guarantees & Rug Pull Protection</h2>

          <div className="bg-linear-to-br from-emerald-500/10 to-violet-500/10 border border-emerald-500/30 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="text-3xl">🔒</div>
              <div>
                <h3 className="text-xl font-bold text-emerald-400 mb-2">Immutable Supply Guarantee</h3>
                <p className="text-zinc-300 leading-relaxed">
                  Once a token is created on Rocket-Mint, the total supply is <strong>permanently fixed at 1 billion tokens</strong>.
                  This is not a promise or policy - it's a cryptographic guarantee enforced by the Solana blockchain itself.
                </p>
              </div>
            </div>

            <h4 className="font-semibold text-white mb-3 mt-6">Why This Matters:</h4>
            <div className="space-y-3 text-zinc-300">
              <div className="flex items-start gap-3">
                <span className="text-emerald-400 mt-1">•</span>
                <span><strong className="text-white">No Hidden Minting:</strong> The creator cannot secretly mint additional
                tokens to dump on the market, which is a common rug pull technique.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-emerald-400 mt-1">•</span>
                <span><strong className="text-white">Fair Distribution:</strong> All 1 billion tokens are accounted for at
                launch - 1% to creator, 99% to bonding curve. There are no hidden reserves.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-emerald-400 mt-1">•</span>
                <span><strong className="text-white">Price Integrity:</strong> Token holders can be confident that their
                holdings won't be diluted by new token issuance.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-emerald-400 mt-1">•</span>
                <span><strong className="text-white">Verifiable:</strong> Anyone can verify on-chain that the mint authority
                is null using Solana explorers like Solscan or SolanaFM.</span>
              </div>
            </div>
          </div>

          <div className="bg-linear-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="text-3xl">❄️</div>
              <div>
                <h3 className="text-xl font-bold text-blue-400 mb-2">No Freeze Risk</h3>
                <p className="text-zinc-300 leading-relaxed">
                  With freeze authority permanently revoked, tokens can <strong>never be frozen or locked</strong> in user wallets.
                  This prevents another common scam where creators freeze tokens to prevent selling.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Verification Guide */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">5. How to Verify Security</h2>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <p className="text-zinc-300 mb-4">
              Don't trust, verify! Here's how to independently confirm that a token launched on Rocket-Mint has the
              security guarantees we claim:
            </p>

            <ol className="space-y-4 text-zinc-300">
              <li className="flex gap-3">
                <span className="font-bold text-violet-400 shrink-0">1.</span>
                <div>
                  <strong className="text-white">Copy the Token Mint Address</strong>
                  <p className="text-sm mt-1">Find the token's mint address on the token page or in your wallet.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-violet-400 shrink-0">2.</span>
                <div>
                  <strong className="text-white">Open Solana Explorer</strong>
                  <p className="text-sm mt-1">Visit <a href="https://solscan.io" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300">Solscan.io</a> or <a href="https://solana.fm" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300">Solana.fm</a></p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-violet-400 shrink-0">3.</span>
                <div>
                  <strong className="text-white">Search for the Mint Address</strong>
                  <p className="text-sm mt-1">Paste the mint address into the search bar.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-violet-400 shrink-0">4.</span>
                <div>
                  <strong className="text-white">Check Token Authority</strong>
                  <p className="text-sm mt-1">
                    Look for the "Mint Authority" and "Freeze Authority" fields. Both should show:
                    <code className="block mt-2 bg-zinc-950 px-3 py-2 rounded text-xs text-emerald-400">
                      Mint Authority: None (Disabled)<br/>
                      Freeze Authority: None (Disabled)
                    </code>
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-violet-400 shrink-0">5.</span>
                <div>
                  <strong className="text-white">Verify Supply</strong>
                  <p className="text-sm mt-1">Confirm the total supply is exactly 1,000,000,000 tokens with 6 decimals.</p>
                </div>
              </li>
            </ol>

            <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-sm text-blue-300">
                <strong>Pro Tip:</strong> If either authority shows an address instead of "None" or "Disabled", the token
                is NOT secure and could be manipulated by that address. Tokens launched on Rocket-Mint will ALWAYS show
                both authorities as disabled.
              </p>
            </div>
          </div>
        </section>

        {/* Comparison */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">6. Comparison with Other Platforms</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left py-3 px-4 font-semibold text-white">Feature</th>
                  <th className="text-center py-3 px-4 font-semibold text-emerald-400">Rocket-Mint</th>
                  <th className="text-center py-3 px-4 font-semibold text-zinc-400">Traditional Platforms</th>
                </tr>
              </thead>
              <tbody className="text-zinc-300">
                <tr className="border-b border-zinc-800">
                  <td className="py-3 px-4">Mint Authority Burning</td>
                  <td className="py-3 px-4 text-center text-emerald-400">✓ Automatic</td>
                  <td className="py-3 px-4 text-center text-red-400">✗ Optional</td>
                </tr>
                <tr className="border-b border-zinc-800">
                  <td className="py-3 px-4">Freeze Authority Burning</td>
                  <td className="py-3 px-4 text-center text-emerald-400">✓ Automatic</td>
                  <td className="py-3 px-4 text-center text-red-400">✗ Optional</td>
                </tr>
                <tr className="border-b border-zinc-800">
                  <td className="py-3 px-4">Fair Launch Model</td>
                  <td className="py-3 px-4 text-center text-emerald-400">✓ Enforced (1%/99%)</td>
                  <td className="py-3 px-4 text-center text-yellow-400">~ Varies</td>
                </tr>
                <tr className="border-b border-zinc-800">
                  <td className="py-3 px-4">Instant Liquidity</td>
                  <td className="py-3 px-4 text-center text-emerald-400">✓ Bonding Curve</td>
                  <td className="py-3 px-4 text-center text-yellow-400">~ Manual Setup</td>
                </tr>
                <tr className="border-b border-zinc-800">
                  <td className="py-3 px-4">Rug Pull Protection</td>
                  <td className="py-3 px-4 text-center text-emerald-400">✓ Guaranteed</td>
                  <td className="py-3 px-4 text-center text-red-400">✗ Not Guaranteed</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">On-Chain Verification</td>
                  <td className="py-3 px-4 text-center text-emerald-400">✓ Always</td>
                  <td className="py-3 px-4 text-center text-emerald-400">✓ Always</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Open Source */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">7. Open Source & Transparency</h2>

          <div className="bg-linear-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="text-3xl">📖</div>
              <div>
                <h3 className="text-xl font-bold text-blue-400 mb-2">100% Open Source</h3>
                <p className="text-zinc-300 leading-relaxed">
                  Rocket-Mint is completely open source. Every line of code that powers this platform is available
                  for anyone to view, audit, learn from, and contribute to. We believe in building trust through
                  transparency, not obscurity.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <h4 className="font-semibold text-white mb-2">Tech Stack</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-3">
                    <div className="text-sm font-semibold text-violet-400">Next.js 15</div>
                    <div className="text-xs text-zinc-400">Frontend</div>
                  </div>
                  <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-3">
                    <div className="text-sm font-semibold text-emerald-400">Firebase</div>
                    <div className="text-xs text-zinc-400">Backend</div>
                  </div>
                  <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-3">
                    <div className="text-sm font-semibold text-blue-400">Solana Web3</div>
                    <div className="text-xs text-zinc-400">Blockchain</div>
                  </div>
                  <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-3">
                    <div className="text-sm font-semibold text-purple-400">TypeScript</div>
                    <div className="text-xs text-zinc-400">Language</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-2">Repository</h4>
                <p className="text-zinc-300 text-sm mb-3">
                  View the complete source code, including smart contract interactions, bonding curve logic,
                  frontend implementation, and all security features:
                </p>
                <a
                  href="https://github.com/mikedhane/rocket-mint"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg transition text-sm"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  View on GitHub
                </a>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-2">Key Features Implemented</h4>
                <ul className="space-y-2 text-sm text-zinc-300">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    <span>Automatic mint & freeze authority revocation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    <span>Bonding curve trading mechanism with dynamic pricing</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    <span>Metaplex Token Metadata integration</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    <span>Real-time trading & portfolio tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    <span>Firebase backend with Firestore & Storage</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-2">License</h4>
                <p className="text-zinc-300 text-sm mb-2">
                  This project is licensed under the <strong>MIT License</strong>, allowing anyone to use, modify,
                  and distribute the code freely.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-2">Contribute</h4>
                <p className="text-zinc-300 text-sm mb-3">
                  We welcome contributions from the community! Whether it's bug fixes, new features, documentation
                  improvements, or feedback - all contributions are appreciated.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="https://github.com/mikedhane/rocket-mint/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded transition"
                  >
                    Report Issues
                  </a>
                  <a
                    href="https://github.com/mikedhane/rocket-mint/pulls"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded transition"
                  >
                    Submit PRs
                  </a>
                  <a
                    href="https://github.com/mikedhane/rocket-mint/discussions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded transition"
                  >
                    Discussions
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Conclusion */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">8. Conclusion</h2>

          <div className="bg-linear-to-br from-violet-500/10 to-emerald-500/10 border border-violet-500/30 rounded-xl p-6">
            <p className="text-zinc-300 leading-relaxed mb-4">
              Rocket-Mint represents a paradigm shift in token launches on Solana. By making security features like
              mint authority burning and freeze authority revocation <strong>mandatory rather than optional</strong>,
              we eliminate entire categories of scams and rug pulls that have plagued the crypto ecosystem.
            </p>
            <p className="text-zinc-300 leading-relaxed mb-4">
              Our platform proves that fair launches don't require trust - they require the right technical implementation.
              When the blockchain itself enforces the rules, both creators and communities can operate with full confidence.
            </p>
            <p className="text-zinc-300 leading-relaxed">
              Whether you're a creator looking to launch a legitimate project or a trader evaluating new tokens,
              Rocket-Mint provides the transparency and security guarantees that the market demands.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-12 text-center">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
            <h3 className="text-2xl font-bold mb-4">Ready to Launch Your Token?</h3>
            <p className="text-zinc-400 mb-6">
              Join the most secure fair launch platform on Solana
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/launch"
                className="px-8 py-3 bg-linear-to-r from-violet-600 to-emerald-600 hover:from-violet-700 hover:to-emerald-700 rounded-lg font-semibold transition"
              >
                Launch a Token
              </Link>
              <Link
                href="/marketplace"
                className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-semibold transition"
              >
                Browse Marketplace
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-zinc-800 text-center text-sm text-zinc-500">
          <p>© 2025 Rocket-Mint. Built on Solana.</p>
          <div className="mt-4 flex justify-center gap-4">
            <Link href="/" className="hover:text-white transition">Home</Link>
            <Link href="/terms" className="hover:text-white transition">Terms</Link>
            <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
