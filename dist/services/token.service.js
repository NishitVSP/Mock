import fs from 'fs';
import csvParser from 'csv-parser';
import fetch from 'node-fetch';
class TokenService {
    constructor() {
        this.tokens = [];
        this.jsonUrl = "https://scripmasterdata.s3.ap-south-1.amazonaws.com/data.json";
        this.csvPath = "C:\\Users\\Lenovo\\Desktop\\programming\\src_typescript\\ScripMaster.csv";
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
        console.log("Loading tokens from JSON and CSV files");
        const allTokens = [];
        for (const indexName of this.indexes) {
            const indexTokens = await this.getOptionTokens(indexName);
            console.log(`Loaded ${indexTokens.length} tokens for ${indexName}`);
            allTokens.push(...indexTokens);
        }
        console.log(`Total tokens before LTP update: ${allTokens.length}`);
        return new Promise((resolve, reject) => {
            const results = [];
            fs.createReadStream(this.csvPath)
                .pipe(csvParser())
                .on('data', (data) => {
                results.push(data);
            })
                .on('end', () => {
                console.log(`Loaded ${results.length} records from CSV`);
                let matchedCount = 0;
                allTokens.forEach(token => {
                    const match = results.find(row => {
                        // Extract token number from symbolCode (e.g., "9219_NSE" -> "9219")
                        const tokenNumber = row.symbolCode?.split('_')[0];
                        return String(tokenNumber) === String(token.tokenNumber);
                    });
                    if (match) {
                        const parsedPrice = parseFloat(match.lastPrice);
                        // Only update if lastPrice is non-negative
                        if (!isNaN(parsedPrice) && parsedPrice >= 0) {
                            token.ltp = parsedPrice;
                            token.instrument = match.instrument;
                            token.tradingSymbol = match.tradingSymbol;
                            matchedCount++;
                        }
                        else {
                            console.log(`Skipped token ${token.tokenNumber} due to negative or invalid lastPrice: ${match.lastPrice}`);
                        }
                    }
                });
                console.log(`Total matched tokens: ${matchedCount}`);
                this.tokens = allTokens;
                resolve(allTokens);
            })
                .on('error', (error) => {
                console.error('Error reading CSV file:', error);
                reject(error);
            });
        });
    }
    getTokens() {
        return this.tokens;
    }
    getTokenByNumber(tokenNumber) {
        return this.tokens.find(token => token.tokenNumber === tokenNumber);
    }
}
export default new TokenService();
