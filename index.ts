import { Worker } from 'worker_threads';
import WorkerManager from './workers/worker.js';
import mqttService from './services/mqtt.service.js';
import tokenService from './services/token.service.js';
import process from 'process';
import logger from './utils/logger.js';

// Declare global type
declare global {
  var workerManager: WorkerManager;
}

let isShuttingDown = false;

async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`\nReceived ${signal}. Shutting down gracefully...`);
  
  try {
    // First terminate all workers
    if (global.workerManager) {
      await global.workerManager.terminateAllWorkers();
    }
    
    // Then disconnect MQTT
    await mqttService.disconnect();
    
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

async function main() {
  try {
    // 1. Load tokens from JSON and update LTP from CSV
    logger.info('Loading tokens...');
    const tokens = await tokenService.loadTokens();
    logger.info(`Loaded ${tokens.length} tokens with LTP values`);

    // 2. Initialize worker manager and start processing
    global.workerManager = new WorkerManager();
    logger.info('Initializing workers...');
    await global.workerManager.initializeWorkers(tokens);

    // Handle graceful shutdown
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    logger.error('Error in main:', error);
    process.exit(1);
  }
}

main(); 