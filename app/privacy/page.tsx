"use client";

import Link from "next/link";
import BottomNav from "@/components/BottomNav";

export default function PrivacyPolicy() {
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
          <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-zinc-400">Last Updated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Content */}
        <div className="prose prose-invert max-w-none space-y-8">
          {/* Introduction */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
            <div className="text-zinc-300 space-y-3">
              <p>
                Rocket-Mint ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our cryptocurrency token launchpad platform.
              </p>
              <p>
                By using our Service, you agree to the collection and use of information in accordance with this Privacy Policy.
              </p>
            </div>
          </section>

          {/* Information We Collect */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-2xl font-bold mb-4">2. Information We Collect</h2>
            <div className="text-zinc-300 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">2.1 Blockchain Information</h3>
                <p>When you interact with our platform, we may collect:</p>
                <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
                  <li>Public wallet addresses</li>
                  <li>Transaction hashes and blockchain data</li>
                  <li>Token creation and trading activity</li>
                  <li>Smart contract interactions</li>
                </ul>
                <p className="mt-2 text-sm text-zinc-400">
                  Note: Blockchain data is public by nature and permanently recorded on the Solana blockchain.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">2.2 Usage Data</h3>
                <p>We automatically collect certain information when you use our Service:</p>
                <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
                  <li>IP address and device information</li>
                  <li>Browser type and version</li>
                  <li>Pages visited and time spent</li>
                  <li>Referring website</li>
                  <li>Operating system</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">2.3 Token Information</h3>
                <p>When you create tokens, we store:</p>
                <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
                  <li>Token name, symbol, and description</li>
                  <li>Token images and metadata</li>
                  <li>Social media links (website, Twitter)</li>
                  <li>Creator wallet address</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">2.4 Third-Party Payment Information</h3>
                <p>
                  When you use third-party payment processors (such as MoonPay), those services collect their own information according to their privacy policies. We do not store your payment card details.
                </p>
              </div>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-2xl font-bold mb-4">3. How We Use Your Information</h2>
            <div className="text-zinc-300 space-y-3">
              <p>We use collected information for:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Platform Operation:</strong> To provide, maintain, and improve our Service</li>
                <li><strong>Transaction Processing:</strong> To facilitate token creation and trading</li>
                <li><strong>Security:</strong> To detect, prevent, and address fraud and security issues</li>
                <li><strong>Analytics:</strong> To understand how users interact with our platform</li>
                <li><strong>Communication:</strong> To send important updates and notifications</li>
                <li><strong>Compliance:</strong> To comply with legal obligations and enforce our Terms</li>
                <li><strong>Support:</strong> To provide customer support and respond to inquiries</li>
              </ul>
            </div>
          </section>

          {/* Data Sharing */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-2xl font-bold mb-4">4. How We Share Your Information</h2>
            <div className="text-zinc-300 space-y-4">
              <p>We may share your information with:</p>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">4.1 Third-Party Services</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Payment Processors:</strong> MoonPay and other payment providers</li>
                  <li><strong>Cloud Storage:</strong> Firebase/Google Cloud for data hosting</li>
                  <li><strong>Analytics:</strong> Services that help us understand platform usage</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">4.2 Public Blockchain</h3>
                <p>
                  All blockchain transactions are publicly visible and permanent. This includes wallet addresses, transaction amounts, and token activities.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">4.3 Legal Requirements</h3>
                <p>We may disclose information if required by law, legal process, or to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
                  <li>Comply with legal obligations</li>
                  <li>Protect our rights and property</li>
                  <li>Prevent fraud or security issues</li>
                  <li>Protect user safety</li>
                </ul>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-blue-400 text-sm">
                  <strong>Note:</strong> We do NOT sell your personal information to third parties for marketing purposes.
                </p>
              </div>
            </div>
          </section>

          {/* Cookies and Tracking */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-2xl font-bold mb-4">5. Cookies and Tracking Technologies</h2>
            <div className="text-zinc-300 space-y-3">
              <p>
                We use cookies and similar tracking technologies to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Remember your preferences and settings</li>
                <li>Analyze platform performance and usage</li>
                <li>Provide personalized experiences</li>
                <li>Secure the platform and prevent fraud</li>
              </ul>
              <p className="mt-4">
                You can control cookies through your browser settings. However, disabling cookies may limit platform functionality.
              </p>
            </div>
          </section>

          {/* Data Security */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-2xl font-bold mb-4">6. Data Security</h2>
            <div className="text-zinc-300 space-y-3">
              <p>
                We implement reasonable security measures to protect your information, including:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Encrypted data transmission (HTTPS/SSL)</li>
                <li>Secure cloud storage with access controls</li>
                <li>Regular security audits and monitoring</li>
                <li>Limited employee access to personal data</li>
              </ul>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mt-4">
                <p className="text-yellow-400 text-sm">
                  <strong>Important:</strong> No method of transmission over the Internet is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
                </p>
              </div>
            </div>
          </section>

          {/* Data Retention */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-2xl font-bold mb-4">7. Data Retention</h2>
            <div className="text-zinc-300 space-y-3">
              <p>
                We retain your information for as long as necessary to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide our services</li>
                <li>Comply with legal obligations</li>
                <li>Resolve disputes and enforce agreements</li>
                <li>Maintain security and prevent fraud</li>
              </ul>
              <p className="mt-4 text-sm text-zinc-400">
                Note: Blockchain data is permanent and cannot be deleted from the public ledger.
              </p>
            </div>
          </section>

          {/* Your Rights */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-2xl font-bold mb-4">8. Your Privacy Rights</h2>
            <div className="text-zinc-300 space-y-3">
              <p>
                Depending on your location, you may have the following rights:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Access:</strong> Request a copy of your personal information</li>
                <li><strong>Correction:</strong> Request correction of inaccurate data</li>
                <li><strong>Deletion:</strong> Request deletion of your data (subject to legal obligations)</li>
                <li><strong>Opt-Out:</strong> Opt-out of marketing communications</li>
                <li><strong>Data Portability:</strong> Receive your data in a portable format</li>
              </ul>
              <p className="mt-4">
                To exercise these rights, contact us at the email address provided below.
              </p>
              <p className="text-sm text-zinc-400 mt-2">
                Note: We cannot modify or delete data already recorded on the blockchain.
              </p>
            </div>
          </section>

          {/* Children's Privacy */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-2xl font-bold mb-4">9. Children's Privacy</h2>
            <div className="text-zinc-300 space-y-3">
              <p>
                Our Service is not intended for users under 18 years of age. We do not knowingly collect personal information from children under 18.
              </p>
              <p>
                If we become aware that we have collected data from a child under 18, we will take steps to delete that information promptly.
              </p>
            </div>
          </section>

          {/* International Data Transfers */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-2xl font-bold mb-4">10. International Data Transfers</h2>
            <div className="text-zinc-300 space-y-3">
              <p>
                Your information may be transferred to and maintained on servers located outside your jurisdiction where data protection laws may differ.
              </p>
              <p>
                By using our Service, you consent to the transfer of your information to other countries, including the United States.
              </p>
            </div>
          </section>

          {/* Third-Party Links */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-2xl font-bold mb-4">11. Third-Party Links and Services</h2>
            <div className="text-zinc-300 space-y-3">
              <p>
                Our Service may contain links to third-party websites and services (e.g., MoonPay, Solscan, wallet providers). We are not responsible for the privacy practices of these third parties.
              </p>
              <p>
                We encourage you to read the privacy policies of any third-party services you use.
              </p>
            </div>
          </section>

          {/* Changes to Privacy Policy */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-2xl font-bold mb-4">12. Changes to This Privacy Policy</h2>
            <div className="text-zinc-300 space-y-3">
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any material changes by:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Posting the new Privacy Policy on this page</li>
                <li>Updating the "Last Updated" date</li>
                <li>Sending a notification (for significant changes)</li>
              </ul>
              <p className="mt-4">
                Your continued use of the Service after changes constitutes acceptance of the updated Privacy Policy.
              </p>
            </div>
          </section>

          {/* GDPR Compliance */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-2xl font-bold mb-4">13. GDPR Compliance (EU Users)</h2>
            <div className="text-zinc-300 space-y-3">
              <p>
                If you are located in the European Economic Area (EEA), you have additional rights under GDPR:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Right to access your personal data</li>
                <li>Right to rectification of inaccurate data</li>
                <li>Right to erasure ("right to be forgotten")</li>
                <li>Right to restrict processing</li>
                <li>Right to data portability</li>
                <li>Right to object to processing</li>
                <li>Right to withdraw consent</li>
              </ul>
              <p className="mt-4">
                Our legal basis for processing your data includes: consent, contract performance, legal obligations, and legitimate interests.
              </p>
            </div>
          </section>

          {/* CCPA Compliance */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-2xl font-bold mb-4">14. CCPA Compliance (California Users)</h2>
            <div className="text-zinc-300 space-y-3">
              <p>
                If you are a California resident, you have rights under the California Consumer Privacy Act (CCPA):
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Right to know what personal information is collected</li>
                <li>Right to know if personal information is sold or disclosed</li>
                <li>Right to opt-out of the sale of personal information</li>
                <li>Right to deletion of personal information</li>
                <li>Right to non-discrimination for exercising CCPA rights</li>
              </ul>
              <p className="mt-4 font-semibold">
                We do NOT sell your personal information.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-2xl font-bold mb-4">15. Contact Us</h2>
            <div className="text-zinc-300 space-y-3">
              <p>
                If you have questions about this Privacy Policy or wish to exercise your privacy rights, contact us at:
              </p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mt-3">
                <p className="font-mono text-sm text-emerald-400">
                  Email: info@rocket-mint.com<br />
                  Support: info@rocket-mint.com<br />
                  Website: https://rocket-mint.com
                </p>
              </div>
              <p className="mt-4 text-sm text-zinc-400">
                We will respond to your request within 30 days.
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-zinc-800">
          <div className="flex flex-wrap gap-4 justify-center text-sm text-zinc-400">
            <Link href="/terms" className="hover:text-violet-400 transition">
              Terms of Service
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
