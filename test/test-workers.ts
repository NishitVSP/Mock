import tokenService from '../services/token.service.js';
import WorkerManager from '../workers/worker.js';

async function testWorkers() {
    try {
        console.log('Starting worker test...\n');

        // Load tokens
        const tokens = await tokenService.loadTokens();
        console.log(`Loaded ${tokens.length} tokens\n`);

        // Initialize worker manager
        const workerManager = new WorkerManager();

        // Initialize workers with tokens
        await workerManager.initializeWorkers(tokens);

        // Keep the process running for 10 seconds to see the output
        console.log('\nWorkers will run for 10 seconds...\n');
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Cleanup
        await workerManager.terminateAllWorkers();
        console.log('\nTest completed');

    } catch (error) {
        console.error('Error in worker test:', error);
    }
}

testWorkers(); 