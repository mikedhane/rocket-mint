import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Rocket-Mint | Launch Fair & Secure Solana Tokens | 100% Immutable Supply",
  description: "The most secure fair launch platform on Solana. Automatically burns mint authority after creation, guaranteeing permanent 1B token supply. No rug pulls, no additional minting, 99% to bonding curve. Launch your meme coin with complete transparency.",
  keywords: [
    "Solana token launch",
    "fair launch platform",
    "burn mint authority",
    "immutable token supply",
    "meme coin launcher",
    "Solana bonding curve",
    "rug pull protection",
    "SPL token creation",
    "Token-2022",
    "secure token launch",
    "Solana DeFi",
    "cryptocurrency launch platform",
    "no freeze authority",
    "transparent token launch",
    "Solana meme coins",
  ],
  authors: [{ name: "Rocket-Mint" }],
  creator: "Rocket-Mint",
  publisher: "Rocket-Mint",
  metadataBase: new URL("https://rocket-mint.web.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://rocket-mint.web.app",
    siteName: "Rocket-Mint",
    title: "Rocket-Mint | 100% Immutable Token Supply | Fair Launch on Solana",
    description: "Launch secure meme coins on Solana with automatically burned mint authority. Guaranteed 1B fixed supply, 99% to bonding curve, zero rug pull risk. The most transparent token launch platform.",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Rocket-Mint - Secure Fair Launch Platform on Solana",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@RocketMint",
    creator: "@RocketMint",
    title: "Rocket-Mint | 100% Immutable Token Supply on Solana",
    description: "Automatically burns mint authority. Guaranteed fixed 1B supply. No rug pulls. Launch your fair meme coin today.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  manifest: "/manifest.json",
  category: "cryptocurrency",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Rocket-Mint",
    "description": "The most secure fair launch platform on Solana. Automatically burns mint authority after creation, guaranteeing permanent 1B token supply with zero rug pull risk.",
    "url": "https://rocket-mint.web.app",
    "applicationCategory": "FinanceApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "description": "Launch secure Solana meme coins with automatically burned mint authority",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": [
      "Automatically burns mint authority after token creation",
      "100% immutable token supply - permanently fixed at 1 billion tokens",
      "No freeze authority - tokens can always trade freely",
      "Fair launch model - 99% to bonding curve, 1% to creator",
      "On-chain verifiable guarantees",
      "Zero rug pull risk",
      "Instant liquidity via bonding curve",
      "SPL Token and Token-2022 support"
    ],
    "author": {
      "@type": "Organization",
      "name": "Rocket-Mint"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "5",
      "ratingCount": "1",
      "bestRating": "5",
      "worstRating": "1"
    }
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-ECESR0CCPH"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-ECESR0CCPH');
          `}
        </Script>

        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
