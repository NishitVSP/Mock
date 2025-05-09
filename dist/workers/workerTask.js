import { parentPort, workerData } from 'worker_threads';
import { generateRandomFluctuation } from '../utils/fluctuationSimulator.js';
import logger from '../utils/logger.js';
// Simulate a task for generating fluctuations
function performTask(tokens) {
    return tokens.map(token => {
        const { newPrice, fluctuationPercent } = generateRandomFluctuation(token.ltp);
        logger.debug(`[Token Worker ${workerData.workerId}] Processing ${token.exchange}_${token.tokenNumber}: Current Price: ${token.ltp}, New Price: ${newPrice}, Fluctuation: ${fluctuationPercent}%`);
        return {
            workerId: workerData.workerId,
            exchange: token.exchange,
            tokenNumber: token.tokenNumber,
            value: newPrice,
            fluctuationPercent,
            timestamp: new Date().toISOString()
        };
    });
}
// Continuously perform the task at 500ms intervals
if (parentPort) {
    logger.info(`[Token Worker ${workerData.workerId}] Starting token data generation for ${workerData.tokens.length} tokens...`);
    setInterval(() => {
        const result = performTask(workerData.tokens);
        parentPort?.postMessage(result);
    }, 500);
}
