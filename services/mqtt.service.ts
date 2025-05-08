import mqtt from 'mqtt';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class MQTTService {
  private client: mqtt.MqttClient | null = null;
  private readonly brokerUrl: string;
  private readonly username: string;
  private readonly password: string;
  private isConnecting: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly maxReconnectAttempts: number = 5;
  private reconnectAttempts: number = 0;
  private readonly reconnectDelay: number = 5000; // 5 seconds
  private readonly topicPrefix: string = 'mock/';
  private isShuttingDown: boolean = false;

  constructor() {
    // Get credentials from environment variables
    this.brokerUrl = process.env.MQTT_BROKER_URL || '';
    this.username = process.env.MQTT_USERNAME || '';
    this.password = process.env.MQTT_PASSWORD || '';

    // Validate required environment variables
    if (!this.brokerUrl || !this.username || !this.password) {
      throw new Error('Missing required MQTT environment variables');
    }
  }

  private async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || this.isShuttingDown) {
      console.error('Max reconnection attempts reached or shutting down');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    try {
      await this.connect();
      this.reconnectAttempts = 0; // Reset counter on successful connection
    } catch (error) {
      console.error('Reconnection failed:', error);
      // Schedule next reconnection attempt
      this.reconnectTimer = setTimeout(() => this.reconnect(), this.reconnectDelay);
    }
  }

  async connect(): Promise<void> {
    if (this.client?.connected) return;
    if (this.isConnecting) return;
    if (this.isShuttingDown) return;

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      const options = {
        username: this.username,
        password: this.password,
        clean: true,
        reconnectPeriod: 0, // Disable automatic reconnection
        connectTimeout: 30000,
        protocol: 'wss' as const,
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
      } else {
        this.setupClient(options, resolve, reject);
      }
    });
  }

  private setupClient(options: mqtt.IClientOptions, resolve: () => void, reject: (error: Error) => void): void {
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

  async publish(topic: string, message: any): Promise<void> {
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
    
    // Use QoS 0 for maximum throughput
    this.client.publish(fullTopic, JSON.stringify(message), {
      
      retain: true,
      properties: {
        messageExpiryInterval: 3000 // Message expires after 3 seconds
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.isShuttingDown) return;
    
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
      } else {
        this.isShuttingDown = false;
        console.log('No MQTT client to disconnect');
        resolve();
      }
    });
  }
}

export default new MQTTService();