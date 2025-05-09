import workerManager from './workers/worker.manager.js';
import tokenService from './services/token.service.js';
async function main() {
    try {
        console.log('Loading tokens...');
        const tokens = await tokenService.loadTokens();
        console.log(`Loaded ${tokens.length} tokens with LTP values`);
        console.log('Initializing workers...');
        await workerManager.initializeWorkers(tokens);
        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\nReceived SIGINT. Shutting down gracefully...');
            await workerManager.terminateAllWorkers();
            process.exit(0);
        });
        process.on('SIGTERM', async () => {
            console.log('\nReceived SIGTERM. Shutting down gracefully...');
            await workerManager.terminateAllWorkers();
            process.exit(0);
        });
    }
    catch (error) {
        console.error('Error in main:', error);
        process.exit(1);
    }
}
main();
