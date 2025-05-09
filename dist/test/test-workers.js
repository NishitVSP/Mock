import tokenService from '../services/token.service.js';
import WorkerManager from '../workers/worker.js';
async function testWorkers() {
    try {
        // console.log('Starting worker test...\n');
        // Load tokens
        const tokens = await tokenService.loadTokens();
        // console.log(`Loaded ${tokens.length} tokens\n`);
        // Initialize worker manager
        const workerManager = new WorkerManager();
        // Initialize workers with tokens
        await workerManager.initializeWorkers(tokens);
        // console.log('\nWorkers will run for 10 seconds...\n');
        // Run for 10 seconds
        await new Promise(resolve => setTimeout(resolve, 10000));
        // Cleanup
        await workerManager.terminateAllWorkers();
        // console.log('\nTest completed');
    }
    catch (error) {
        console.error('Error in worker test:', error);
    }
}
testWorkers();
