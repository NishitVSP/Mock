interface FluctuationResult {
  newPrice: number;
  fluctuationPercent: number;
}

export function generateRandomFluctuation(currentPrice: number): FluctuationResult {
  // Generate a random fluctuation between -0.5% and +0.5%
  const fluctuationPercent = (Math.random() - 0.5) * 1;
  const fluctuationAmount = currentPrice * (fluctuationPercent / 100);
  const newPrice = currentPrice + fluctuationAmount;

  return {
    newPrice: Number(newPrice.toFixed(2)),
    fluctuationPercent: Number(fluctuationPercent.toFixed(2))
  };
} 