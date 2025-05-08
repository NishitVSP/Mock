import mqtt from 'mqtt';
import dotenv from 'dotenv';
// Load environment variables
dotenv.config();
class MQTTService {
    constructor() {
        this.client = null;
        this.isConnecting = false;
        this.reconnectTimer = null;
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
                reconnectPeriod: 1000,
                connectTimeout: 30000,
                protocol: 'wss',
                rejectUnauthorized: false
            };
            console.log('Connecting to MQTT broker with options:', { url: this.brokerUrl, username: this.username });
            this.client = mqtt.connect(this.brokerUrl, options);
            this.client.on('connect', () => {
                console.log('Connected to MQTT broker');
                this.isConnecting = false;
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
            });
            this.client.on('reconnect', () => {
                console.log('Attempting to reconnect to MQTT broker...');
            });
        });
    }
    async publish(topic, message) {
        if (!this.client?.connected) {
            await this.connect();
        }
        return new Promise((resolve, reject) => {
            if (!this.client) {
                reject(new Error('MQTT client not initialized'));
                return;
            }
            this.client.publish(`mock/token.${topic}`, JSON.stringify(message), (error) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve();
                }
            });
        });
    }
    async disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        return new Promise((resolve) => {
            if (this.client) {
                this.client.end(true, () => {
                    this.client = null;
                    resolve();
                });
            }
            else {
                resolve();
            }
        });
    }
}
export default new MQTTService();
