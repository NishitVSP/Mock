import { parentPort } from 'worker_threads';
import { generateRandomFluctuation } from '../utils/fluctuationSimulator.js';
import { getIndexLastPrices } from '../services/indexes.service.js';

interface IndexData {
  indexName: string;
  value: number;
  fluctuationPercent: number;
  timestamp: string;
}

// Simulate a task for generating index fluctuations
async function performTask(): Promise<IndexData[]> {
  const indexPrices = await getIndexLastPrices();
  const result: IndexData[] = [];

  for (const [indexName, currentPrice] of Object.entries(indexPrices)) {
    const { newPrice, fluctuationPercent } = generateRandomFluctuation(currentPrice);
    result.push({
      indexName,
      value: newPrice,
      fluctuationPercent,
      timestamp: new Date().toISOString()
    });
  }

  return result;
}

// Continuously perform the task at 500ms intervals
if (parentPort) {
  setInterval(async () => {
    const result = await performTask();
    parentPort?.postMessage(result);
  }, 500);
} 