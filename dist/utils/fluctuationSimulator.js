export function generateRandomFluctuation(currentPrice) {
    // Generate random fluctuation between -5% and +5%
    const fluctuationPercent = (Math.random() * 10 - 5);
    const priceChange = currentPrice * (fluctuationPercent / 100);
    const newPrice = currentPrice + priceChange;
    return {
        newPrice: Number(newPrice.toFixed(2)),
        fluctuationPercent: Number(fluctuationPercent.toFixed(2))
    };
}
