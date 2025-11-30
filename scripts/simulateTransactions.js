// Script to simulate buy/sell transactions for testing toast notifications
require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// Initialize Firebase Admin using environment variables
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "rocket-mint.firebasestorage.app"
});

const db = admin.firestore();

// Example mint address - replace with the actual token you're testing with
const MINT_ADDRESS = "E5ga2JhF214tSCHihCaxnWTV514MXXLGUXhXYjkEi4DG"; // Replace with your test token

// Generate random wallet addresses
function generateRandomWallet() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789';
  let result = '';
  for (let i = 0; i < 44; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Simulate transactions
async function simulateTransactions() {
  console.log('🚀 Simulating transactions...\n');

  const transactions = [
    {
      mintAddress: MINT_ADDRESS,
      type: "buy",
      price: 0.000000674,
      tokenAmount: "5000000",
      solAmount: "41600000",
      user: generateRandomWallet(),
      timestamp: new Date().toISOString(),
      network: "devnet",
    },
    {
      mintAddress: MINT_ADDRESS,
      type: "buy",
      price: 0.000000680,
      tokenAmount: "8500000",
      solAmount: "60000000",
      user: generateRandomWallet(),
      timestamp: new Date(Date.now() + 2000).toISOString(), // 2 seconds later
      network: "devnet",
    },
    {
      mintAddress: MINT_ADDRESS,
      type: "sell",
      price: 0.000000670,
      tokenAmount: "3000000",
      solAmount: "25000000",
      user: generateRandomWallet(),
      timestamp: new Date(Date.now() + 4000).toISOString(), // 4 seconds later
      network: "devnet",
    },
    {
      mintAddress: MINT_ADDRESS,
      type: "buy",
      price: 0.000000685,
      tokenAmount: "12000000",
      solAmount: "90000000",
      user: generateRandomWallet(),
      timestamp: new Date(Date.now() + 6000).toISOString(), // 6 seconds later
      network: "devnet",
    },
    {
      mintAddress: MINT_ADDRESS,
      type: "buy",
      price: 0.000000690,
      tokenAmount: "7500000",
      solAmount: "55000000",
      user: generateRandomWallet(),
      timestamp: new Date(Date.now() + 8000).toISOString(), // 8 seconds later
      network: "devnet",
    },
  ];

  // Add transactions with delays
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];

    await new Promise(resolve => setTimeout(resolve, i * 2000)); // Wait 2 seconds between each

    await db.collection('transactions').add(tx);

    const action = tx.type === 'buy' ? '📈 BUY' : '📉 SELL';
    const usdAmount = (Number(tx.solAmount) / 1_000_000_000 * 137.79).toFixed(2); // Assuming ~$138 SOL
    const tokenAmount = (Number(tx.tokenAmount) / 1_000_000).toFixed(2);

    console.log(`${action}  $${usdAmount} | ${tokenAmount}M tokens | ${tx.user.slice(0, 4)}...${tx.user.slice(-4)}`);
  }

  console.log('\n✅ Simulation complete! Check the swap page for notifications.');
  process.exit(0);
}

simulateTransactions().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
