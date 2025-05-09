import { Worker } from 'worker_threads';
import os from 'os';
import tokenService from '../services/token.service.js';
import mqttConnection from '../connections/mqtt.connection.js';
import publisherService from '../services/publisher.service.js';

interface Token {
  exchange: string;
  tokenNumber: string;
  ltp: number;
}

interface MarketData {
  workerId: number;
  exchange: string;
  tokenNumber: string;
  value: number;
  fluctuationPercent: number;
  timestamp: string;
}

interface IndexData {
  indexName: string;
  value: number;
  fluctuationPercent: number;
  timestamp: string;
}

class WorkerManager {
  private workers: Worker[] = [];
  private indexWorker: Worker | null = null;
  private readonly workerCount: number;
  private isShuttingDown: boolean = false;

  constructor() {
    const numCores = os.cpus().length;
    this.workerCount = Math.max(1, numCores - 2);
    console.log(`Initializing ${this.workerCount} workers (${numCores} CPU cores available)`);
  }

  async initializeWorkers(tokens: Token[]): Promise<void> {
    const tokensPerWorker = Math.ceil(tokens.length / this.workerCount);
    const promises: Promise<void>[] = [];

    try {
      // Connect to MQTT before starting workers
      await mqttConnection.connect();
      console.log('Connected to MQTT broker');

      // Initialize token workers
      for (let i = 0; i < this.workerCount; i++) {
        const start = i * tokensPerWorker;
        const end = Math.min(start + tokensPerWorker, tokens.length);
        const workerTokens = tokens.slice(start, end);

        if (workerTokens.length > 0) {
          console.log(`Worker ${i + 1} will process ${workerTokens.length} tokens`);
          promises.push(this.runWorker(workerTokens, i + 1));
        }
      }

      // Initialize index worker
      promises.push(this.runIndexWorker());

      await Promise.all(promises);
      console.log(`All ${this.workerCount} workers and index worker initialized`);
    } catch (error) {
      console.error('Error initializing workers:', error);
      await this.terminateAllWorkers();
      throw error;
    }
  }

  private runIndexWorker(): Promise<void> {
    return new Promise((resolve, reject) => {
      const worker = new Worker('./dist/workers/index.worker.js');

      worker.on('message', async (result: IndexData[]) => {
        if (this.isShuttingDown) return;

        try {
          // Process and publish each index's data
          for (const data of result) {
            const message = {
              value: data.value,
              fluctuation: data.fluctuationPercent,
              timestamp: data.timestamp
            };
            
            await publisherService.publishIndexData(data.indexName, message);
          }

          console.log(
            `Index worker published ${result.length} updates at ${new Date().toLocaleTimeString()}`
          );
        } catch (error) {
          if (!this.isShuttingDown) {
            console.error('Error publishing MQTT messages from index worker:', error);
          }
        }
      });

      worker.on('error', (error) => {
        if (!this.isShuttingDown) {
          console.error('Index worker error:', error);
          reject(error);
        }
      });

      worker.on('exit', (code) => {
        if (code !== 0 && !this.isShuttingDown) {
          const error = new Error(`Index worker stopped with exit code ${code}`);
          console.error(error);
          reject(error);
        }
      });

      this.indexWorker = worker;
      resolve();
    });
  }

  private runWorker(tokens: Token[], workerId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const worker = new Worker('./dist/workers/token.worker.js', {
        workerData: { tokens, workerId }
      });

      worker.on('message', async (result: MarketData[]) => {
        if (this.isShuttingDown) return;

        try {
          // Process and publish each token's data
          for (const data of result) {
            const message = {
              value: data.value,
              fluctuation: data.fluctuationPercent,
              timestamp: data.timestamp
            };
            
            await publisherService.publishTokenData(data.exchange, data.tokenNumber, message);
          }

          // Log summary
          console.log(
            `Worker ${workerId} published ${result.length} updates at ${new Date().toLocaleTimeString()}`
          );
        } catch (error) {
          if (!this.isShuttingDown) {
            console.error(`Error publishing MQTT messages from worker ${workerId}:`, error);
          }
        }
      });

      worker.on('error', (error) => {
        if (!this.isShuttingDown) {
          console.error(`Worker ${workerId} error:`, error);
          reject(error);
        }
      });

      worker.on('exit', (code) => {
        if (code !== 0 && !this.isShuttingDown) {
          const error = new Error(`Worker ${workerId} stopped with exit code ${code}`);
          console.error(error);
          reject(error);
        }
      });

      this.workers.push(worker);
      resolve();
    });
  }

  async terminateAllWorkers(): Promise<void> {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    console.log('Terminating all workers...');
    
    try {
      // Terminate all token workers
      await Promise.all(this.workers.map(worker => worker.terminate()));
      this.workers = [];

      // Terminate index worker
      if (this.indexWorker) {
        await this.indexWorker.terminate();
        this.indexWorker = null;
      }

      // Disconnect MQTT after workers are terminated
      await mqttConnection.disconnect();
      console.log('All workers terminated and MQTT disconnected');
    } catch (error) {
      console.error('Error during cleanup:', error);
    } finally {
      this.isShuttingDown = false;
    }
  }
}

export default new WorkerManager(); 