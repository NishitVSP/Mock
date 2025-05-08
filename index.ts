import { Worker } from 'worker_threads';
import WorkerManager from './workers/worker.js';
import mqttService from './services/mqtt.service.js';
import tokenService from './services/token.service.js';
import process from 'process';


interface MarketData {
  workerId: number;
  exchange: string;
  tokenNumber: string;
  value: number;
  fluctuationPercent: number;
  timestamp: number;
}

async function main() {
  try {
    // 1. Load tokens from JSON and update LTP from CSV
    console.log('Loading tokens...');
    const tokens = await tokenService.loadTokens();
    console.log(`Loaded ${tokens.length} tokens with LTP values`);

    // 2. Initialize worker manager and start processing
    const workerManager = new WorkerManager();
    console.log('Initializing workers...');
    await workerManager.initializeWorkers(tokens);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nReceived SIGINT. Shutting down gracefully...');
      await workerManager.terminateAllWorkers();
      process.exit(0);
    });

  } catch (error) {
    console.error('Error in main:', error);
    process.exit(1);
  }
}

main(); 