//services\mqtt.service.ts
import mqtt from 'mqtt';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';
// Load environment variables
dotenv.config();
class MQTTService {
    constructor() {
        this.client = null;
        this.isConnecting = false;
        this.topicPrefix = 'mock/';
        // Get credentials from environment variables
        this.brokerUrl = process.env.MQTT_BROKER_URL || '';
        this.username = process.env.MQTT_USERNAME || '';
        this.password = process.env.MQTT_PASSWORD || '';
        // Validate required environment variables
        if (!this.brokerUrl || !this.username || !this.password) {
            throw new Error('Missing required MQTT environment variables');
        }
    }
    async connect() {
        if (this.client?.connected)
            return;
        if (this.isConnecting)
            return;
        this.isConnecting = true;
        return new Promise((resolve, reject) => {
            const options = {
                username: this.username,
                password: this.password,
                clean: true,
                connectTimeout: 30000,
                protocol: 'wss',
                rejectUnauthorized: false,
                keepalive: 60,
                clientId: `mqtt_client_${Date.now()}`,
                queueQoSZero: true
            };
            logger.info('Connecting to MQTT broker...');
            if (this.client) {
                this.client.end(true, () => {
                    this.client = null;
                    this.setupClient(options, resolve, reject);
                });
            }
            else {
                this.setupClient(options, resolve, reject);
            }
        });
    }
    setupClient(options, resolve, reject) {
        this.client = mqtt.connect(this.brokerUrl, options);
        this.client.on('connect', () => {
            logger.info('Connected to MQTT broker');
            this.isConnecting = false;
            resolve();
        });
        this.client.on('error', (error) => {
            logger.error('MQTT connection error:', error);
            this.isConnecting = false;
            reject(error);
        });
        this.client.on('close', () => {
            logger.info('MQTT connection closed');
            this.isConnecting = false;
            this.client = null;
        });
        this.client.on('offline', () => {
            logger.info('MQTT client went offline');
            this.client = null;
        });
    }
    async publish(topic, message) {
        if (!this.client?.connected) {
            await this.connect();
        }
        if (!this.client) {
            logger.error('Failed to connect to MQTT broker');
            return;
        }
        const fullTopic = `${this.topicPrefix}${topic}`;
        // console.log(fullTopic, message);
        this.client.publish(fullTopic, JSON.stringify(message), {
            retain: true,
            properties: {
                messageExpiryInterval: 3000
            }
        });
    }
    async disconnect() {
        if (!this.client)
            return;
        return new Promise((resolve) => {
            this.client?.end(true, () => {
                this.client = null;
                logger.info('MQTT client disconnected');
                resolve();
            });
        });
    }
}
export default new MQTTService();
