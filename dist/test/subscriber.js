import mqttService from '../services/mqtt.service.js';
async function startSubscriber() {
    try {
        await mqttService.connect();
        mqttService.subscribe('market/#', (topic, message) => {
            console.log(`[${topic}] Price: ${message.value}, Change: ${message.fluctuationPercent}%`);
        });
        process.on('SIGINT', () => {
            console.log('Shutting down subscriber...');
            mqttService.disconnect();
            process.exit(0);
        });
    }
    catch (error) {
        console.error('Error starting subscriber:', error);
        process.exit(1);
    }
}
startSubscriber();
