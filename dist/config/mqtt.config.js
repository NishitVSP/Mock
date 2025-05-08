const mqttConfig = {
    url: "wss://emqx.trado.trade/mqtt",
    options: {
        username: "nishit_test",
        password: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im5pc2hpdF90ZXN0IiwiaWF0IjoxNzQ2NjI4MDYyfQ.nRPgH6v1vh3Vq-o8EltGOnCckGep6SJR8arNhu0nHro",
        protocol: 'wss',
        protocolVersion: 4,
        clean: true,
        reconnectPeriod: 1000,
        connectTimeout: 30000,
        rejectUnauthorized: false
    }
};
export default mqttConfig;
