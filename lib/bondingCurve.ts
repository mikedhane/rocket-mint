// Bonding curve implementation for token swaps
// Uses a linear bonding curve with configurable parameters

export type BondingCurveConfig = {
  // Total tokens allocated to the bonding curve
  totalSupply: bigint;
  // Initial price in lamports per token (in base units)
  initialPrice: number;
  // Final price in lamports per token when all tokens sold
  finalPrice: number;
  // Platform fee in basis points (100 = 1%)
  platformFeeBps: number;
  // Creator fee in basis points (100 = 1%)
  creatorFeeBps: number;
};

export type BondingCurveState = {
  // Tokens remaining in the curve
  tokensRemaining: bigint;
  // Total tokens sold so far
  tokensSold: bigint;
  // SOL collected in the curve (in lamports)
  solCollected: bigint;
};

/**
 * Calculate the current price per token based on how many tokens have been sold
 * Uses linear interpolation between initialPrice and finalPrice
 */
export function getCurrentPrice(
  config: BondingCurveConfig,
  tokensSold: bigint
): number {
  const progress = Number(tokensSold) / Number(config.totalSupply);
  const priceRange = config.finalPrice - config.initialPrice;
  return config.initialPrice + priceRange * progress;
}

/**
 * Calculate how many tokens you get for a given SOL amount (in lamports)
 * Accounts for the bonding curve and fees
 */
export function calculateTokensForSol(
  config: BondingCurveConfig,
  state: BondingCurveState,
  solAmount: bigint
): {
  tokensReceived: bigint;
  platformFee: bigint;
  creatorFee: bigint;
  netSol: bigint;
  avgPrice: number;
} {
  // Calculate fees
  const totalFeeBps = config.platformFeeBps + config.creatorFeeBps;
  const totalFee = (solAmount * BigInt(totalFeeBps)) / BigInt(10000);
  const platformFee = (solAmount * BigInt(config.platformFeeBps)) / BigInt(10000);
  const creatorFee = (solAmount * BigInt(config.creatorFeeBps)) / BigInt(10000);
  const netSol = solAmount - totalFee;

  // Integrate the bonding curve to find how many tokens for this SOL amount
  // Using numerical integration (simplified for linear curve)
  let remainingSol = Number(netSol);
  let tokensReceived = BigInt(0);
  let currentTokensSold = state.tokensSold;

  // Step through in increments to calculate
  // Use 1% of remaining tokens or 1M tokens as step size for efficiency
  const step = Math.floor(Math.min(
    Math.max(Number(state.tokensRemaining) / 100, 1_000_000),
    Number(state.tokensRemaining)
  ));

  while (remainingSol > 0 && tokensReceived < state.tokensRemaining) {
    const currentPrice = getCurrentPrice(config, currentTokensSold);
    const tokensToBuy = Math.min(step, Number(state.tokensRemaining) - Number(tokensReceived));
    const cost = currentPrice * tokensToBuy;

    if (cost > remainingSol) {
      // Buy fractional amount with remaining SOL
      const fractionalTokens = Math.floor(remainingSol / currentPrice);
      tokensReceived += BigInt(fractionalTokens);
      break;
    }

    remainingSol -= cost;
    tokensReceived += BigInt(tokensToBuy);
    currentTokensSold += BigInt(tokensToBuy);
  }

  const avgPrice = Number(netSol) / Number(tokensReceived);

  return {
    tokensReceived,
    platformFee,
    creatorFee,
    netSol,
    avgPrice,
  };
}

/**
 * Calculate how much SOL you get for selling tokens
 * Uses the reverse of the buying curve
 */
export function calculateSolForTokens(
  config: BondingCurveConfig,
  state: BondingCurveState,
  tokenAmount: bigint
): {
  solReceived: bigint;
  platformFee: bigint;
  creatorFee: bigint;
  grossSol: bigint;
  avgPrice: number;
} {
  if (tokenAmount > state.tokensSold) {
    throw new Error("Cannot sell more tokens than have been sold from curve");
  }

  // Integrate backwards on the curve
  let grossSol = 0;
  let remainingTokens = Number(tokenAmount);
  let currentTokensSold = state.tokensSold;

  // Use 1% of tokens or 1M tokens as step size for efficiency
  const step = Math.floor(Math.min(
    Math.max(Number(tokenAmount) / 100, 1_000_000),
    Number(tokenAmount)
  ));

  while (remainingTokens > 0) {
    const tokensToSell = Math.min(step, remainingTokens);
    currentTokensSold -= BigInt(tokensToSell);
    const currentPrice = getCurrentPrice(config, currentTokensSold);
    grossSol += currentPrice * tokensToSell;
    remainingTokens -= tokensToSell;
  }

  const grossSolBigInt = BigInt(Math.floor(grossSol));

  // Deduct fees
  const totalFeeBps = config.platformFeeBps + config.creatorFeeBps;
  const totalFee = (grossSolBigInt * BigInt(totalFeeBps)) / BigInt(10000);
  const platformFee = (grossSolBigInt * BigInt(config.platformFeeBps)) / BigInt(10000);
  const creatorFee = (grossSolBigInt * BigInt(config.creatorFeeBps)) / BigInt(10000);
  const solReceived = grossSolBigInt - totalFee;

  const avgPrice = Number(grossSolBigInt) / Number(tokenAmount);

  return {
    solReceived,
    platformFee,
    creatorFee,
    grossSol: grossSolBigInt,
    avgPrice,
  };
}

/**
 * Format lamports to SOL with specified decimals
 */
export function lamportsToSol(lamports: bigint, decimals: number = 4): string {
  const sol = Number(lamports) / 1_000_000_000;
  return sol.toFixed(decimals);
}

/**
 * Format tokens from base units to human readable
 */
export function formatTokenAmount(
  amount: bigint,
  decimals: number = 6
): string {
  const divisor = BigInt(10) ** BigInt(decimals);
  const integerPart = amount / divisor;
  const fractionalPart = amount % divisor;

  if (fractionalPart === BigInt(0)) {
    return Number(integerPart).toLocaleString();
  }

  const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
  const trimmed = fractionalStr.replace(/0+$/, "");
  return `${Number(integerPart).toLocaleString()}.${trimmed}`;
}
