import { parentPort, workerData } from 'worker_threads';
import { generateRandomFluctuation } from '../utils/fluctuationSimulator.js';
// Simulate a task for generating fluctuations
function performTask(tokens) {
    return tokens.map(token => {
        const { newPrice, fluctuationPercent } = generateRandomFluctuation(token.ltp);
        // console.log(`Worker ${workerData.workerId} - Token: ${token.tokenNumber}, New Price: ${newPrice}, Fluctuation: ${fluctuationPercent}%`);
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
// Continuously perform the task at 333ms intervals (3 times per second)
if (parentPort) {
    setInterval(() => {
        const result = performTask(workerData.tokens);
        parentPort?.postMessage(result);
    }, 333); // Run 3 times per second
}
