import dotenv from 'dotenv';
import { z } from 'zod';
// Load environment variables
dotenv.config();
// Configuration schema
const configSchema = z.object({
    mqtt: z.object({
        brokerUrl: z.string().url(),
        username: z.string(),
        password: z.string(),
        topicPrefix: z.string(),
    }),
    app: z.object({
        logLevel: z.enum(['error', 'warn', 'info', 'debug']),
        workerCount: z.number().int().positive(),
        dataUpdateIntervalMs: z.number().int().positive(),
    }),
});
// Default configuration
const defaultConfig = {
    mqtt: {
        brokerUrl: 'wss://emqx.trado.trade/mqtt',
        username: 'nishit_test',
        password: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im5pc2hpdF90ZXN0IiwiaWF0IjoxNzQ2NjI4MDYyfQ.nRPgH6v1vh3Vq-o8EltGOnCckGep6SJR8arNhu0nHro',
        topicPrefix: 'mock',
    },
    app: {
        logLevel: 'info',
        workerCount: 4,
        dataUpdateIntervalMs: 1000,
    },
};
// Validate and export configuration
const config = configSchema.parse(defaultConfig);
// Log configuration (excluding sensitive data)
// console.log('MQTT Configuration:', {
//   brokerUrl: config.mqtt.brokerUrl,
//   username: config.mqtt.username,
//   topicPrefix: config.mqtt.topicPrefix
// });
export default config;
