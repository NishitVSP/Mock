import mqttConnection from '../connections/mqtt.connection.js';

interface PublishData {
  value: number;
  fluctuation: number;
  timestamp: string;
}

class PublisherService {
  async publishTokenData(exchange: string, tokenNumber: string, data: PublishData): Promise<void> {
    const topic = `${exchange}_${tokenNumber}`;
    await mqttConnection.publish(topic, data);
  }

  async publishIndexData(indexName: string, data: PublishData): Promise<void> {
    const topic = this.getIndexTopic(indexName);
    if (!topic) {
      console.error(`Invalid index name: ${indexName}`);
      return;
    }
    await mqttConnection.publish(topic, data);
  }

  private getIndexTopic(indexName: string): string | null {
    switch (indexName) {
      case 'BANKNIFTY':
        return 'NSE_NIFTYBANK';
      case 'NIFTY':
        return 'NSE_NIFTY50';
      case 'FINNIFTY':
        return 'NSE_FINNIFTY';
      case 'MIDCPNIFTY':
        return 'NSE_MIDCPNIFTY';
      case 'BANKEX':
        return 'BSE_BANKEX';
      case 'SENSEX':
        return 'BSE_SENSEX';
      default:
        return null;
    }
  }
}

export default new PublisherService(); 