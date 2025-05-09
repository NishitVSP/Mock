// services\token.service.ts
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';
class TokenService {
    constructor() {
        this.tokens = [];
        this.jsonUrl = "https://scripmasterdata.s3.ap-south-1.amazonaws.com/data.json";
        this.indexes = ['BANKNIFTY', 'NIFTY', 'FINNIFTY', 'MIDCPNIFTY', 'BANKEX', 'SENSEX'];
    }
    async getScripMasterData() {
        try {
            const response = await fetch(this.jsonUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data;
        }
        catch (error) {
            console.error('Error fetching scrip master data:', error);
            // Return empty object as fallback
            return {};
        }
    }
    async getOptionTokens(indexName) {
        const scripMasterData = await this.getScripMasterData();
        if (!scripMasterData[indexName]) {
            console.error(`Index ${indexName} not found in script master data`);
            return [];
        }
        const indexData = scripMasterData[indexName];
        const tokens = [];
        const missingExpiries = [];
        const exchange = indexName === 'BANKEX' || indexName === 'SENSEX' ? 'BSE_FO' : 'NSE_FO';
        const sortedExpiries = [...indexData.expiries].sort((a, b) => {
            const dateA = new Date(a.year, a.month - 1, a.day);
            const dateB = new Date(b.year, b.month - 1, b.day);
            return dateA.getTime() - dateB.getTime();
        });
        sortedExpiries.forEach((expiry, idx) => {
            const month = expiry.month.toString().padStart(2, '0');
            const day = expiry.day.toString().padStart(2, '0');
            const expiryKey = `${day}-${month}-${expiry.year}`;
            const expiryData = indexData[expiryKey];
            if (!expiryData || !expiryData.ce || !expiryData.pe) {
                missingExpiries.push(expiryKey);
                return;
            }
            const allStrikes = Object.keys(expiryData.ce)
                .map(Number)
                .sort((a, b) => a - b);
            if (allStrikes.length === 0) {
                console.warn(`No strikes found for ${indexName} at expiry ${expiryKey}`);
                return;
            }
            const middleIndex = Math.floor(allStrikes.length / 2);
            const strikesToGet = idx === 0 ? 40 : 20;
            const startIdx = Math.max(0, middleIndex - strikesToGet);
            const endIdx = Math.min(allStrikes.length - 1, middleIndex + strikesToGet);
            const selectedStrikes = allStrikes.slice(startIdx, endIdx + 1);
            selectedStrikes.forEach((strike) => {
                const strikeStr = strike.toString();
                if (expiryData.ce[strikeStr]) {
                    tokens.push({
                        exchange,
                        tokenNumber: expiryData.ce[strikeStr].token,
                        strike: strike,
                        type: 'CE',
                        ltp: 0
                    });
                }
            });
            selectedStrikes.forEach((strike) => {
                const strikeStr = strike.toString();
                if (expiryData.pe[strikeStr]) {
                    tokens.push({
                        exchange,
                        tokenNumber: expiryData.pe[strikeStr].token,
                        strike: strike,
                        type: 'PE',
                        ltp: 0
                    });
                }
            });
        });
        if (missingExpiries.length > 0) {
            console.warn(`Missing expiries for ${indexName}:`, missingExpiries);
        }
        return tokens;
    }
    async loadTokens() {
        try {
            const csvPath = path.join(process.cwd(), 'ScripMaster.csv');
            const fileContent = await fs.readFile(csvPath, 'utf-8');
            const lines = fileContent.split('\n').slice(1); // Skip header
            return lines
                .filter(line => line.trim())
                .map(line => {
                const [exchange, tokenNumber, ltp] = line.split(',').map(field => field.trim());
                return {
                    exchange,
                    tokenNumber,
                    ltp: parseFloat(ltp) || 0
                };
            })
                .filter(token => token.ltp > 0);
        }
        catch (error) {
            console.error('Error loading tokens:', error);
            return [];
        }
    }
    getTokens() {
        return this.tokens;
    }
    getTokenByNumber(tokenNumber) {
        return this.tokens.find(token => token.tokenNumber === tokenNumber);
    }
}
export default new TokenService();
