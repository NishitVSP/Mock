import dotenv from 'dotenv';
// Load environment variables
dotenv.config();
export const config = {
    mqtt: {
        brokerUrl: process.env.MQTT_BROKER_URL || '',
        username: process.env.MQTT_USERNAME || '',
        password: process.env.MQTT_PASSWORD || '',
        topicPrefix: 'mock/',
        maxReconnectAttempts: 5,
        reconnectDelay: 5000,
        connectTimeout: 30000,
        keepalive: 60
    },
    workers: {
        tokenWorkerCount: 3,
        updateInterval: 1000 // 1 second
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        logDir: 'logs'
    }
};
// Validate required environment variables
if (!config.mqtt.brokerUrl || !config.mqtt.username || !config.mqtt.password) {
    throw new Error('Missing required MQTT environment variables');
}
