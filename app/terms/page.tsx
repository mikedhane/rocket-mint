"use client";

import Link from "next/link";
import BottomNav from "@/components/BottomNav";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-linear-to-b from-zinc-950 to-zinc-900 text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-violet-400 hover:text-violet-300 mb-4 transition"
          >
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
          <p className="text-zinc-400">Last Updated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Content */}
        <div className="prose prose-invert max-w-none space-y-8">
          {/* Introduction */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-2xl font-bold mb-4">1. Agreement to Terms</h2>
            <div className="text-zinc-300 space-y-3">
              <p>
                Welcome to Rocket-Mint ("Platform", "Service", "we", "us", or "our"). These Terms of Service ("Terms") govern your access to and use of our cryptocurrency token launchpad platform, including any content, functionality, and services offered on or through our website.
              </p>
              <p>
                By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the Service.
              </p>
            </div>
          </section>

          {/* Eligibility */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-2xl font-bold mb-4">2. Eligibility</h2>
            <div className="text-zinc-300 space-y-3">
              <p>
                You must be at least 18 years old to use this Service. By using this Service, you represent and warrant that you:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Are at least 18 years of age</li>
                <li>Have the legal capacity to enter into these Terms</li>
                <li>Are not prohibited from using the Service under applicable laws</li>
                <li>Are not located in a jurisdiction where cryptocurrency services are prohibited</li>
              </ul>
            </div>
          </section>

          {/* Service Description */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-2xl font-bold mb-4">3. Service Description</h2>
            <div className="text-zinc-300 space-y-3">
              <p>
                Rocket-Mint provides a platform for creating, launching, and trading SPL tokens on the Solana blockchain. Our services include:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Token creation and minting tools</li>
                <li>Bonding curve-based token trading</li>
                <li>Marketplace for token discovery</li>
                <li>Integration with third-party payment processors</li>
              </ul>
            </div>
          </section>

          {/* Risks */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-2xl font-bold mb-4">4. Risks and Disclaimers</h2>
            <div className="text-zinc-300 space-y-3">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                <p className="text-red-400 font-semibold">⚠️ IMPORTANT: Cryptocurrency Risk Warning</p>
              </div>
              <p>
                By using this Service, you acknowledge and accept the following risks:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Volatility:</strong> Cryptocurrency prices are highly volatile and may result in significant losses</li>
                <li><strong>No Guarantees:</strong> We make no guarantees about token performance or value</li>
                <li><strong>Smart Contract Risk:</strong> Smart contracts may contain bugs or vulnerabilities</li>
                <li><strong>Regulatory Risk:</strong> Cryptocurrency regulations vary by jurisdiction and may change</li>
                <li><strong>Irreversible Transactions:</strong> Blockchain transactions cannot be reversed or refunded</li>
                <li><strong>Loss of Funds:</strong> You may lose all funds invested in tokens</li>
              </ul>
              <p className="mt-4 font-semibold">
                You should only invest what you can afford to lose. Cryptocurrency trading involves substantial risk.
              </p>
            </div>
          </section>

          {/* User Obligations */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-2xl font-bold mb-4">5. User Obligations</h2>
            <div className="text-zinc-300 space-y-3">
              <p>You agree NOT to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Use the Service for any illegal purpose or in violation of any laws</li>
                <li>Create tokens that violate intellectual property rights</li>
                <li>Engage in market manipulation, fraud, or deceptive practices</li>
                <li>Attempt to hack, disrupt, or compromise the Service</li>
                <li>Create tokens that promote illegal activities, hate speech, or harmful content</li>
                <li>Use the Service to facilitate money laundering or terrorist financing</li>
                <li>Impersonate any person or entity</li>
              </ul>
            </div>
          </section>

          {/* Fees */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-2xl font-bold mb-4">6. Fees</h2>
            <div className="text-zinc-300 space-y-3">
              <p>
                Rocket-Mint charges the following fees:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Platform Fee:</strong> 1% fee on all token trades</li>
                <li><strong>Creation Fee:</strong> Nominal SOL fee for creating tokens (covers blockchain costs)</li>
                <li><strong>Network Fees:</strong> Standard Solana network transaction fees apply</li>
              </ul>
              <p className="mt-4">
                Fees are subject to change with notice. Third-party services (such as MoonPay) may charge additional fees.
              </p>
            </div>
          </section>

          {/* Wallet Responsibility */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-2xl font-bold mb-4">7. Wallet and Security</h2>
            <div className="text-zinc-300 space-y-3">
              <p>
                You are solely responsible for:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Maintaining the security of your wallet and private keys</li>
                <li>All transactions made with your wallet</li>
                <li>Keeping your wallet credentials confidential</li>
                <li>Any loss of funds due to compromised wallet security</li>
              </ul>
              <p className="mt-4 font-semibold">
                We do NOT have access to your private keys and CANNOT recover lost funds or reverse transactions.
              </p>
            </div>
          </section>

          {/* Intellectual Property */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-2xl font-bold mb-4">8. Intellectual Property</h2>
            <div className="text-zinc-300 space-y-3">
              <p>
                The Service and its original content, features, and functionality are owned by Rocket-Mint and are protected by international copyright, trademark, and other intellectual property laws.
              </p>
              <p>
                When you create a token, you retain ownership of your token's name, symbol, and associated content. However, you grant us a license to display and promote your token on our platform.
              </p>
            </div>
          </section>

          {/* Limitation of Liability */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-2xl font-bold mb-4">9. Limitation of Liability</h2>
            <div className="text-zinc-300 space-y-3">
              <p className="uppercase font-semibold">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>The Service is provided "AS IS" without warranties of any kind</li>
                <li>We are not liable for any losses or damages arising from your use of the Service</li>
                <li>We are not responsible for third-party services (MoonPay, wallets, etc.)</li>
                <li>We are not liable for blockchain network failures or issues</li>
                <li>Our total liability shall not exceed the fees you paid in the last 30 days</li>
              </ul>
            </div>
          </section>

          {/* Indemnification */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-2xl font-bold mb-4">10. Indemnification</h2>
            <div className="text-zinc-300 space-y-3">
              <p>
                You agree to indemnify, defend, and hold harmless Rocket-Mint and its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Your use of the Service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any rights of another party</li>
                <li>Tokens you create or trade on the platform</li>
              </ul>
            </div>
          </section>

          {/* Termination */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-2xl font-bold mb-4">11. Termination</h2>
            <div className="text-zinc-300 space-y-3">
              <p>
                We reserve the right to terminate or suspend your access to the Service immediately, without prior notice, for any reason, including:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Violation of these Terms</li>
                <li>Illegal or fraudulent activity</li>
                <li>Risk to the platform or other users</li>
                <li>At our sole discretion</li>
              </ul>
            </div>
          </section>

          {/* Governing Law */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-2xl font-bold mb-4">12. Governing Law</h2>
            <div className="text-zinc-300 space-y-3">
              <p>
                These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law provisions.
              </p>
            </div>
          </section>

          {/* Changes to Terms */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-2xl font-bold mb-4">13. Changes to Terms</h2>
            <div className="text-zinc-300 space-y-3">
              <p>
                We reserve the right to modify these Terms at any time. We will notify users of any material changes by posting the new Terms on this page and updating the "Last Updated" date.
              </p>
              <p>
                Your continued use of the Service after changes constitutes acceptance of the new Terms.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-2xl font-bold mb-4">14. Contact Us</h2>
            <div className="text-zinc-300 space-y-3">
              <p>
                If you have any questions about these Terms, please contact us at:
              </p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mt-3">
                <p className="font-mono text-sm text-emerald-400">
                  Email: info@rocket-mint.com<br />
                  Website: https://rocket-mint.com
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-zinc-800">
          <div className="flex flex-wrap gap-4 justify-center text-sm text-zinc-400">
            <Link href="/privacy" className="hover:text-violet-400 transition">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/" className="hover:text-violet-400 transition">
              Home
            </Link>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
