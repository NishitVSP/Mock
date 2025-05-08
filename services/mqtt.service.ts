import mqtt from 'mqtt';

class MQTTService {
  private client: mqtt.MqttClient | null = null;
  private readonly brokerUrl: string;
  private readonly username: string;
  private readonly password: string;
  private isConnecting: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.brokerUrl = 'wss://emqx.trado.trade/mqtt';
    this.username = 'user_ashish';
    this.password = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InVzZXJfYXNoaXNoIiwiaWF0IjoxNzQ2NjA3NDYyfQ.0fJoZRLYowKV7F35OMThb6OjA4BwzLyNT5GTbn_jn04';
  }

  async connect(): Promise<void> {
    if (this.client?.connected) return;
    if (this.isConnecting) return;

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      const options = {
        username: this.username,
        password: this.password,
        clean: true,
        reconnectPeriod: 1000,
        connectTimeout: 30000,
        protocol: 'wss' as const,
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

  async publish(topic: string, message: any): Promise<void> {
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
        } else {
          resolve();
        }
      });
    });
  }

  async disconnect(): Promise<void> {
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
      } else {
        resolve();
      }
    });
  }
}

export default new MQTTService();