import { Worker } from 'worker_threads';
import os from 'os';
import mqttService from '../services/mqtt.service.js';
import logger from '../utils/logger.js';
class WorkerManager {
    constructor() {
        this.workers = [];
        this.indexWorker = null;
        this.isShuttingDown = false;
        const numCores = os.cpus().length;
        this.workerCount = Math.max(1, numCores - 2);
        logger.info(`Initializing ${this.workerCount} workers (${numCores} CPU cores available)`);
    }
    async initializeWorkers(tokens) {
        const tokensPerWorker = Math.ceil(tokens.length / this.workerCount);
        const promises = [];
        try {
            // Connect to MQTT before starting workers
            await mqttService.connect();
            logger.info('Connected to MQTT broker');
            // Initialize token workers
            for (let i = 0; i < this.workerCount; i++) {
                const start = i * tokensPerWorker;
                const end = Math.min(start + tokensPerWorker, tokens.length);
                const workerTokens = tokens.slice(start, end);
                if (workerTokens.length > 0) {
                    logger.info(`Worker ${i + 1} will process ${workerTokens.length} tokens`);
                    promises.push(this.runWorker(workerTokens, i + 1));
                }
            }
            // Initialize index worker
            promises.push(this.runIndexWorker());
            await Promise.all(promises);
            logger.info(`All ${this.workerCount} workers and index worker initialized`);
        }
        catch (error) {
            logger.error('Error initializing workers:', error);
            await this.terminateAllWorkers();
            throw error;
        }
    }
    runIndexWorker() {
        return new Promise((resolve, reject) => {
            const worker = new Worker('./dist/workers/indexWorkerTask.js');
            worker.on('message', async (result) => {
                if (this.isShuttingDown)
                    return;
                try {
                    // Process and publish each index's data
                    for (const data of result) {
                        const topic = `mock/${data.indexName}`;
                        const message = {
                            value: data.value,
                            fluctuation: data.fluctuationPercent,
                            timestamp: data.timestamp
                        };
                        await mqttService.publish(topic, message);
                    }
                    logger.info(`Index worker published ${result.length} updates at ${new Date().toLocaleTimeString()}`);
                }
                catch (error) {
                    if (!this.isShuttingDown) {
                        logger.error('Error publishing MQTT messages from index worker:', error);
                    }
                }
            });
            worker.on('error', (error) => {
                if (!this.isShuttingDown) {
                    logger.error('Index worker error:', error);
                    reject(error);
                }
            });
            worker.on('exit', (code) => {
                if (code !== 0 && !this.isShuttingDown) {
                    const error = new Error(`Index worker stopped with exit code ${code}`);
                    logger.error(error);
                    reject(error);
                }
            });
            this.indexWorker = worker;
            resolve();
        });
    }
    runWorker(tokens, workerId) {
        return new Promise((resolve, reject) => {
            const worker = new Worker('./dist/workers/workerTask.js', {
                workerData: { tokens, workerId }
            });
            worker.on('message', async (result) => {
                if (this.isShuttingDown)
                    return;
                try {
                    // Process and publish each token's data
                    for (const data of result) {
                        const topic = `${data.exchange}_${data.tokenNumber}`;
                        const message = {
                            value: data.value,
                            fluctuation: data.fluctuationPercent,
                            timestamp: data.timestamp
                        };
                        await mqttService.publish(topic, message);
                    }
                    logger.info(`Worker ${workerId} published ${result.length} updates at ${new Date().toLocaleTimeString()}`);
                }
                catch (error) {
                    if (!this.isShuttingDown) {
                        logger.error(`Error publishing MQTT messages from worker ${workerId}:`, error);
                    }
                }
            });
            worker.on('error', (error) => {
                if (!this.isShuttingDown) {
                    logger.error(`Worker ${workerId} error:`, error);
                    reject(error);
                }
            });
            worker.on('exit', (code) => {
                if (code !== 0 && !this.isShuttingDown) {
                    const error = new Error(`Worker ${workerId} stopped with exit code ${code}`);
                    logger.error(error);
                    reject(error);
                }
            });
            this.workers.push(worker);
            resolve();
        });
    }
    async terminateAllWorkers() {
        if (this.isShuttingDown)
            return;
        this.isShuttingDown = true;
        logger.info('Terminating all workers...');
        try {
            // First, terminate all token workers
            if (this.workers.length > 0) {
                logger.info(`Terminating ${this.workers.length} token workers...`);
                await Promise.all(this.workers.map(worker => {
                    logger.info('Terminating token worker...');
                    return worker.terminate();
                }));
                this.workers = [];
                logger.info('All token workers terminated');
            }
            // Then terminate index worker
            if (this.indexWorker) {
                logger.info('Terminating index worker...');
                await this.indexWorker.terminate();
                this.indexWorker = null;
                logger.info('Index worker terminated');
            }
            // Finally disconnect MQTT
            logger.info('Disconnecting MQTT...');
            await mqttService.disconnect();
            logger.info('All workers terminated and MQTT disconnected');
        }
        catch (error) {
            logger.error('Error during cleanup:', error);
            throw error;
        }
        finally {
            this.isShuttingDown = false;
        }
    }
}
export default WorkerManager;
