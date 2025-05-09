import { Worker } from 'worker_threads';
import os from 'os';
import mqttService from '../services/mqtt.service.js';
class WorkerManager {
    constructor() {
        this.workers = [];
        this.indexWorker = null;
        this.isShuttingDown = false;
        const numCores = os.cpus().length;
        this.workerCount = Math.max(1, numCores - 2);
        console.log(`Initializing ${this.workerCount} workers (${numCores} CPU cores available)`);
    }
    async initializeWorkers(tokens) {
        const tokensPerWorker = Math.ceil(tokens.length / this.workerCount);
        const promises = [];
        try {
            // Connect to MQTT before starting workers
            await mqttService.connect();
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
        }
        catch (error) {
            console.error('Error initializing workers:', error);
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
                    console.log(`Index worker published ${result.length} updates at ${new Date().toLocaleTimeString()}`);
                }
                catch (error) {
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
                    // Log summary
                    console.log(`Worker ${workerId} published ${result.length} updates at ${new Date().toLocaleTimeString()}`);
                }
                catch (error) {
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
    async terminateAllWorkers() {
        if (this.isShuttingDown)
            return;
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
            await mqttService.disconnect();
            console.log('All workers terminated and MQTT disconnected');
        }
        catch (error) {
            console.error('Error during cleanup:', error);
        }
        finally {
            this.isShuttingDown = false;
        }
    }
}
export default WorkerManager;
