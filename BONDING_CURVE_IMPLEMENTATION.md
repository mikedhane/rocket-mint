# Bonding Curve Swap System - Implementation Summary

## ✅ What We Built

Your Rocket-Mint platform now has a **complete bonding curve token swap system** similar to pump.fun, allowing users to buy and sell tokens directly through the platform with automatic price discovery.

## 🏗️ Architecture Overview

### **1. Bonding Curve Logic** (`lib/bondingCurve.ts`)
- **Linear bonding curve**: Price increases linearly as more tokens are sold
- **Configurable parameters**:
  - Initial price: 0.000000001 SOL per token
  - Final price: 0.001 SOL per token (when all reserve tokens are sold)
  - Platform fee: 1%
  - Creator fee: 1%
- **Functions**:
  - `calculateTokensForSol()` - Calculate how many tokens user gets for SOL
  - `calculateSolForTokens()` - Calculate how much SOL user gets for selling tokens
  - `getCurrentPrice()` - Get current token price based on curve position

### **2. Token Launch Flow** (Updated `app/launch/page.tsx`)
When a user creates a token:
- ✅ **90%** of tokens allocated to bonding curve reserve
- ✅ **10%** of tokens allocated to creator
- ✅ Reserve wallet (Keypair) created automatically
- ✅ Bonding curve configuration stored in Firestore
- ✅ Initial curve state tracked (tokens remaining, sold, SOL collected)

### **3. Swap Interface** (`app/swap/[mint]/page.tsx`)
Beautiful UI showing:
- ✅ Token information and image
- ✅ Bonding curve progress bar
- ✅ Current price and tokens sold
- ✅ Buy/Sell tabs
- ✅ Real-time swap preview with fees
- ✅ Live transaction status updates

### **4. Server-Side Swap API** (`app/api/swap/route.ts`)
Secure server-side transaction builder:
- ✅ Fetches reserve wallet private key (stored in Firestore)
- ✅ Builds Solana transaction with all necessary instructions
- ✅ Partially signs with reserve wallet
- ✅ Returns transaction to client for user signature
- ✅ Updates curve state in Firestore after swap
- ✅ Distributes fees to platform treasury and creator

### **5. Dashboard Integration** (`app/dash/DashboardClient.tsx`)
- ✅ Trade buttons on each token card
- ✅ Token balance display for connected wallet
- ✅ Solscan links for blockchain verification

## 🔄 How It Works

### **Buying Flow:**
1. User enters SOL amount → sees token preview
2. Clicks "Buy Tokens"
3. Client calls `/api/swap` with parameters
4. Server builds transaction with reserve wallet signature
5. User signs transaction in wallet
6. Transaction sent to Solana network
7. Tokens transferred from reserve to user
8. SOL goes to reserve (minus fees)
9. Curve state updated in Firestore

### **Selling Flow:**
1. User enters token amount → sees SOL preview
2. Clicks "Sell Tokens"
3. Same API flow as buying
4. Tokens transferred from user to reserve
5. SOL sent from reserve to user (minus fees)
6. Curve state updated

## 📊 Fee Distribution

On every swap:
- **Platform Fee (1%)**: Goes to `NEXT_PUBLIC_PLATFORM_TREASURY`
- **Creator Fee (1%)**: Goes to token creator's wallet
- **Net Amount**: Remaining SOL/tokens to user

## 🔐 Security Notes

**Reserve Wallet Private Keys** are now secured using **Google Cloud KMS (Key Management Service)**:

✅ **Encryption**: Private keys are encrypted with Google Cloud KMS before storing in Firestore
- Uses FIPS 140-2 Level 3 Hardware Security Modules (HSMs)
- Keys never leave Google's secure infrastructure unencrypted
- Industry-standard AES-256 encryption

✅ **Implementation**:
- `lib/kmsEncryption.ts` - Encryption/decryption helper functions
- `app/api/record-launch/route.ts` - Encrypts keys during token creation
- `app/api/swap/route.ts` - Decrypts keys for swap transactions
- `app/api/swap/finalize/route.ts` - Decrypts keys for transaction finalization

✅ **Metadata Tracking**:
- `encryptionMethod: "gcp-kms"` - Identifies encrypted keys
- `encryptionKeyVersion: 1` - Tracks encryption key version
- Backward compatible with legacy unencrypted keys

✅ **KMS Configuration**:
- Project: `rocket-mint`
- Location: `global`
- Key Ring: `rocket-mint-keys`
- Encryption Key: `reserve-wallet-key`

✅ **Cost**: ~$2/year ($0.06/month per key + $0.03 per 10,000 operations)

**Testing**: Run `npx tsx scripts/test-kms.ts` to verify encryption/decryption flow



## 🧪 Testing the Flow

### **Step 1: Create a Token**
```
1. Go to http://localhost:3000/launch
2. Connect your devnet wallet
3. Fill in token details (name, symbol, image)
4. Click "Launch Coin"
5. Approve the transaction
6. Wait for "✅ Mint successful!"
7. Copy the mint address
```

### **Step 2: View on Dashboard**
```
1. Go to http://localhost:3000/dash
2. See your token with balance display
3. Click "Trade" button
```

### **Step 3: Test Swaps**
```
BUY:
1. Enter SOL amount (e.g., 0.1)
2. See preview of tokens you'll receive
3. Click "Buy Tokens"
4. Approve in wallet
5. Wait for confirmation

SELL:
1. Switch to "Sell" tab
2. Enter token amount
3. See preview of SOL you'll receive
4. Click "Sell Tokens"
5. Approve in wallet
6. Wait for confirmation
```

### **Step 4: Verify Progress**
```
- Watch bonding curve progress bar fill up
- See current price increase as more tokens are sold
- Check your token balance on dashboard
```

## 📁 File Structure

```
app/
├── launch/page.tsx              # Token creation (updated)
├── swap/[mint]/page.tsx         # Swap interface (new)
├── dash/
│   ├── page.tsx                 # Dashboard server component
│   └── DashboardClient.tsx      # Dashboard with trade buttons (updated)
├── api/
    ├── swap/route.ts            # Server-side swap logic (new)
    ├── token/[mint]/route.ts    # Token data API (updated)
    └── record-launch/route.ts   # Launch recording (updated)

lib/
└── bondingCurve.ts              # Bonding curve calculations (new)
```

## 🎓 Automatic Liquidity Pool Graduation

When a token reaches **$1M USD in collected SOL** (calculated dynamically based on current SOL/USD price), it automatically "graduates" and a **Raydium AMM liquidity pool** is created:

### **How It Works:**
1. ✅ Token hits graduation threshold ($1M USD worth of SOL)
2. ✅ Bonding curve marked as `graduated: true` in Firestore
3. ✅ `/api/create-pool` endpoint triggered asynchronously
4. ✅ All remaining tokens + all collected SOL moved to Raydium pool
5. ✅ LP tokens automatically **burned** (liquidity permanently locked)
6. ✅ Pool ID saved to Firestore for frontend display
7. ✅ Users can now trade on Raydium with no platform intermediary

### **Why This Matters:**
- **Trustless**: Once graduated, liquidity is permanently locked in a DEX
- **No rugpull risk**: Platform owner cannot withdraw liquidity
- **Standard trading**: Token trades on Raydium like any other SPL token
- **Professional**: Matches how pump.fun and other successful platforms work

### **Technical Implementation:**
- `lib/raydiumLP.ts` - Raydium pool creation and LP burning logic
- `app/api/create-pool/route.ts` - Async pool creation endpoint
- `app/api/swap/route.ts` - Triggers pool creation on graduation
- Uses **Raydium SDK v2** for pool creation
- Supports both devnet and mainnet-beta

## 🚀 What's Next?

**Potential Enhancements:**
1. **Charts**: Add price charts using on-chain data
2. **Social features**: Comments, likes, trending tokens
3. **Multiple bonding curves**: Exponential, logarithmic options
4. **Token-2022 support**: Use Token Extensions for extra features
5. **Anti-bot measures**: Add limits, captcha for fairness
6. **Leaderboard**: Top traders, biggest gains
7. **Notifications**: Alert users of swaps on their tokens
8. **Graduated tokens UI**: Show "Trade on Raydium" button for graduated tokens

## 🎉 You're Done!

Your platform now has a **complete token launchpad with integrated DEX functionality**. Users can:
- ✅ Create meme tokens with one click
- ✅ Buy and sell tokens instantly
- ✅ Track their holdings
- ✅ Earn fees as token creators
- ✅ Platform earns fees on every swap

**The foundation is solid and ready for production after proper security hardening!**
