import { parentPort, workerData } from 'worker_threads';
import { generateRandomFluctuation } from '../utils/fluctuationSimulator.js';
import { getIndexLastPrices } from '../services/indexes.service.js';
import logger from '../utils/logger.js';

interface IndexData {
  indexName: string;
  value: number;
  fluctuationPercent: number;
  timestamp: string;
}

function getTopicForIndex(indexName: string): string {
  switch (indexName) {
    case 'BANKNIFTY':
      return 'NSE_NIFTYBANK';
    case 'NIFTY':
      return 'NSE_NIFTY50';
    case 'FINNIFTY':
      return 'NSE_FINNIFTY';
    case 'MIDCPNIFTY':
      return 'NSE_MIDCPNIFTY';
    case 'BANKEX':
      return 'BSE_BANKEX';
    case 'SENSEX':
      return 'BSE_SENSEX';
    default:
      return '';
  }
}

// Simulate a task for generating index fluctuations
async function performTask(): Promise<IndexData[]> {
  const indexPrices = await getIndexLastPrices();
  const result: IndexData[] = [];

  for (const [indexName, currentPrice] of Object.entries(indexPrices)) {
    const { newPrice, fluctuationPercent } = generateRandomFluctuation(currentPrice);
    const topic = getTopicForIndex(indexName);
    logger.debug(`[Index Worker] Processing ${indexName}: Current Price: ${currentPrice}, New Price: ${newPrice}, Fluctuation: ${fluctuationPercent}%, Topic: mock/${topic}`);
    
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
  logger.info('[Index Worker] Starting index data generation...');
  setInterval(async () => {
    const result = await performTask();
    parentPort?.postMessage(result);
  }, 500);
} 