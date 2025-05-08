import mqtt from 'mqtt';
import dotenv from 'dotenv';
// Load environment variables
dotenv.config();
class MQTTService {
    constructor() {
        this.client = null;
        this.isConnecting = false;
        this.reconnectTimer = null;
        this.maxReconnectAttempts = 5;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 5000; // 5 seconds
        this.topicPrefix = 'mock/';
        this.isShuttingDown = false;
        // Get credentials from environment variables
        this.brokerUrl = process.env.MQTT_BROKER_URL || '';
        this.username = process.env.MQTT_USERNAME || '';
        this.password = process.env.MQTT_PASSWORD || '';
        // Validate required environment variables
        if (!this.brokerUrl || !this.username || !this.password) {
            throw new Error('Missing required MQTT environment variables');
        }
    }
    async reconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts || this.isShuttingDown) {
            console.error('Max reconnection attempts reached or shutting down');
            return;
        }
        this.reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        try {
            await this.connect();
            this.reconnectAttempts = 0; // Reset counter on successful connection
        }
        catch (error) {
            console.error('Reconnection failed:', error);
            // Schedule next reconnection attempt
            this.reconnectTimer = setTimeout(() => this.reconnect(), this.reconnectDelay);
        }
    }
    async connect() {
        if (this.client?.connected)
            return;
        if (this.isConnecting)
            return;
        if (this.isShuttingDown)
            return;
        this.isConnecting = true;
        return new Promise((resolve, reject) => {
            const options = {
                username: this.username,
                password: this.password,
                clean: true,
                reconnectPeriod: 0, // Disable automatic reconnection
                connectTimeout: 30000,
                protocol: 'wss',
                rejectUnauthorized: false,
                keepalive: 60,
                clientId: `mqtt_client_${Date.now()}`, // Unique client ID
                queueQoSZero: false, // Don't queue QoS 0 messages
                resubscribe: false // Don't resubscribe on reconnect
            };
            console.log('Connecting to MQTT broker with options:', { url: this.brokerUrl, username: this.username });
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
        // Set max listeners
        this.client.setMaxListeners(20);
        this.client.on('connect', () => {
            console.log('Connected to MQTT broker');
            this.isConnecting = false;
            this.reconnectAttempts = 0;
            resolve();
        });
        this.client.on('error', (error) => {
            if (!this.isConnecting) {
                console.error('MQTT connection error:', error);
            }
            this.isConnecting = false;
            reject(error);
        });
        this.client.on('close', () => {
            console.log('MQTT connection closed');
            this.isConnecting = false;
            if (!this.isShuttingDown) {
                this.reconnect();
            }
        });
        this.client.on('offline', () => {
            console.log('MQTT client went offline');
            if (!this.isShuttingDown) {
                this.reconnect();
            }
        });
    }
    async publish(topic, message) {
        if (this.isShuttingDown) {
            return;
        }
        if (!this.client?.connected) {
            await this.connect();
        }
        if (!this.client) {
            return;
        }
        const fullTopic = `${this.topicPrefix}${topic}`;
        console.log(`Publishing message to topic: ${fullTopic}`, message);
        this.client.publish(fullTopic, JSON.stringify(message), {
            retain: true,
            properties: {
                messageExpiryInterval: 3000 // Message expires after 3 seconds
            }
        });
    }
    async disconnect() {
        if (this.isShuttingDown)
            return;
        this.isShuttingDown = true;
        console.log('Disconnecting MQTT client...');
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        return new Promise((resolve) => {
            if (this.client) {
                this.client.end(true, () => {
                    this.client = null;
                    this.isShuttingDown = false;
                    console.log('MQTT client disconnected successfully');
                    resolve();
                });
            }
            else {
                this.isShuttingDown = false;
                console.log('No MQTT client to disconnect');
                resolve();
            }
        });
    }
}
export default new MQTTService();
